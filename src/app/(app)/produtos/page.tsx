import { AlertTriangle, Boxes, Layers, ShoppingBag } from "lucide-react";
import { connection } from "next/server";
import { AnimatedShell } from "@/components/animated-shell";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { ProductCatalog } from "@/components/product-catalog";
import { ProductCreateModal } from "@/components/product-create-modal";
import { prisma } from "@/lib/prisma";

export default async function ProductsPage() {
  await connection();
  const products = await prisma.product.findMany({
    include: { variants: { orderBy: [{ color: "asc" }, { size: "asc" }] } },
    orderBy: { createdAt: "desc" }
  });
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

  return (
    <AnimatedShell className="grid gap-6">
      <PageHeader
        title="Produtos"
        description="Cadastre a peça uma vez e controle cada variação por SKU, cor, tamanho, custo, preço e estoque."
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Modelos" value={String(catalogProducts.length)} detail="Produtos cadastrados" icon={ShoppingBag} tone="primary" />
        <MetricCard label="Variações" value={String(totalVariants)} detail="SKUs ativos no catálogo" icon={Layers} tone="success" />
        <MetricCard label="Unidades em estoque" value={String(totalUnits)} detail="Soma de todas as variações" icon={Boxes} tone="warning" />
        <MetricCard label="Estoque baixo" value={String(lowStockCount)} detail="Variações abaixo do mínimo" icon={AlertTriangle} tone="danger" />
      </section>

      <ProductCatalog products={catalogProducts} />
      <ProductCreateModal />
    </AnimatedShell>
  );
}
