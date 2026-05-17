import { AlertTriangle, Boxes, Layers, ShoppingBag } from "lucide-react";
import { connection } from "next/server";
import { AnimatedShell } from "@/components/animated-shell";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { ProductCatalog } from "@/components/product-catalog";
import { ProductCreateModal } from "@/components/product-create-modal";
import { ProductGrowthKit, type ReorderProduct, type StagnantProduct } from "@/components/product-growth-kit";
import { prisma } from "@/lib/prisma";
import { buildProductPromotionMessage } from "@/lib/whatsapp";

export default async function ProductsPage() {
  await connection();

  const now = new Date();
  const ago30 = new Date(now);
  ago30.setDate(ago30.getDate() - 30);
  const ago60 = new Date(now);
  ago60.setDate(ago60.getDate() - 60);
  const ago90 = new Date(now);
  ago90.setDate(ago90.getDate() - 90);

  const [products, orderItems] = await Promise.all([
    prisma.product.findMany({
      include: { variants: { orderBy: [{ color: "asc" }, { size: "asc" }] } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.orderItem.findMany({
      where: {
        variantId: { not: null },
        order: { status: { not: "CANCELED" } }
      },
      select: {
        quantity: true,
        variantId: true,
        order: { select: { createdAt: true } }
      }
    })
  ]);

  const catalogProducts = products.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    brand: product.brand,
    gender: product.gender,
    status: product.status,
    tags: product.tags,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      color: variant.color,
      size: variant.size,
      costPrice: Number(variant.costPrice),
      salePrice: Number(variant.salePrice),
      stockQuantity: variant.stockQuantity,
      minStock: variant.minStock
    }))
  }));

  const totalUnits = catalogProducts.reduce(
    (sum, product) => sum + product.variants.reduce((acc, variant) => acc + variant.stockQuantity, 0),
    0
  );
  const totalVariants = catalogProducts.reduce((sum, product) => sum + product.variants.length, 0);
  const lowStockCount = catalogProducts.reduce(
    (sum, product) =>
      sum + product.variants.filter((variant) => variant.stockQuantity <= variant.minStock).length,
    0
  );

  const salesByVariant = new Map<string, { sold30: number; sold60: number; sold90: number; lastSoldAt: Date | null }>();
  for (const item of orderItems) {
    if (!item.variantId) continue;
    const current = salesByVariant.get(item.variantId) ?? { sold30: 0, sold60: 0, sold90: 0, lastSoldAt: null };
    const createdAt = item.order.createdAt;
    if (createdAt >= ago30) current.sold30 += item.quantity;
    if (createdAt >= ago60) current.sold60 += item.quantity;
    if (createdAt >= ago90) current.sold90 += item.quantity;
    if (!current.lastSoldAt || createdAt > current.lastSoldAt) current.lastSoldAt = createdAt;
    salesByVariant.set(item.variantId, current);
  }

  const stagnantProducts: StagnantProduct[] = [];
  const reorderProducts: ReorderProduct[] = [];

  for (const product of catalogProducts) {
    const stock = product.variants.reduce((sum, variant) => sum + variant.stockQuantity, 0);
    const minPrice = product.variants.length ? Math.min(...product.variants.map((variant) => variant.salePrice)) : null;
    const lowStockSkus = product.variants.filter((variant) => variant.stockQuantity <= variant.minStock).length;
    const productSales = product.variants.reduce(
      (acc, variant) => {
        const sales = salesByVariant.get(variant.id);
        acc.sold30 += sales?.sold30 ?? 0;
        acc.sold60 += sales?.sold60 ?? 0;
        acc.sold90 += sales?.sold90 ?? 0;
        if (sales?.lastSoldAt && (!acc.lastSoldAt || sales.lastSoldAt > acc.lastSoldAt)) acc.lastSoldAt = sales.lastSoldAt;
        return acc;
      },
      { sold30: 0, sold60: 0, sold90: 0, lastSoldAt: null as Date | null }
    );

    const daysWithoutSale = productSales.lastSoldAt
      ? Math.floor((now.getTime() - productSales.lastSoldAt.getTime()) / 86_400_000)
      : null;

    if (stock > 0 && product.status === "ACTIVE") {
      const stagnantBucket =
        productSales.sold90 === 0 ? 90 :
          productSales.sold60 === 0 ? 60 :
            productSales.sold30 === 0 ? 30 :
              null;

      if (stagnantBucket) {
        const suggestion =
          stagnantBucket >= 90 ? "queimar estoque com oferta clara" :
            stagnantBucket >= 60 ? "repostar com condicao especial" :
              "fazer promocao leve ou combo";
        stagnantProducts.push({
          id: product.id,
          name: product.name,
          category: product.category,
          stock,
          minPrice,
          daysWithoutSale,
          bucket: stagnantBucket,
          suggestion,
          message: buildProductPromotionMessage({
            productName: product.name,
            price: minPrice,
            stock,
            daysWithoutSale
          })
        });
      }
    }

    const dailySales = productSales.sold30 / 30;
    const targetStock = Math.ceil(dailySales * 21);
    const suggestedByTurnover = Math.max(0, targetStock - stock);
    const suggestedByMinimum = product.variants.reduce(
      (sum, variant) => sum + Math.max(0, variant.minStock * 2 - variant.stockQuantity),
      0
    );
    const suggestedQty = Math.max(suggestedByTurnover, suggestedByMinimum);

    if (suggestedQty > 0 || lowStockSkus > 0) {
      reorderProducts.push({
        id: product.id,
        name: product.name,
        stock,
        sold30: productSales.sold30,
        sold90: productSales.sold90,
        lowStockSkus,
        suggestedQty: Math.max(1, suggestedQty),
        priority: productSales.sold30 >= 5 && lowStockSkus > 0 ? "high" : lowStockSkus > 0 ? "medium" : "low"
      });
    }
  }

  stagnantProducts.sort((a, b) => b.bucket - a.bucket || b.stock - a.stock);
  reorderProducts.sort((a, b) => {
    const priority = { high: 3, medium: 2, low: 1 };
    return priority[b.priority] - priority[a.priority] || b.sold30 - a.sold30;
  });
  const bestSellers = [...reorderProducts].sort((a, b) => b.sold30 - a.sold30).filter((item) => item.sold30 > 0);

  return (
    <AnimatedShell className="grid gap-6">
      <PageHeader
        title="Produtos"
        description="Cadastre a peca uma vez e controle cada variacao por SKU, cor, tamanho, custo, preco e estoque."
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Modelos" value={String(catalogProducts.length)} detail="Produtos cadastrados" icon={ShoppingBag} tone="primary" />
        <MetricCard label="Variacoes" value={String(totalVariants)} detail="SKUs ativos no catalogo" icon={Layers} tone="success" />
        <MetricCard label="Unidades em estoque" value={String(totalUnits)} detail="Soma de todas as variacoes" icon={Boxes} tone="warning" />
        <MetricCard label="Estoque baixo" value={String(lowStockCount)} detail="Variacoes abaixo do minimo" icon={AlertTriangle} tone="danger" />
      </section>

      <ProductGrowthKit
        stagnantProducts={stagnantProducts}
        reorderProducts={reorderProducts}
        bestSellers={bestSellers}
      />

      <ProductCatalog products={catalogProducts} />
      <ProductCreateModal />
    </AnimatedShell>
  );
}
