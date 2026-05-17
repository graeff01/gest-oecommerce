import { AlertTriangle, ArrowDownToLine, PackagePlus, Sparkles, X } from "lucide-react";
import { DeleteButton } from "@/components/delete-button";
import { connection } from "next/server";
import { AnimatedShell } from "@/components/animated-shell";
import { PageHeader } from "@/components/page-header";
import { PurchaseForm } from "@/components/purchase-form";
import { ResponsiveFormPanel } from "@/components/responsive-form-panel";
import { SmartPurchasePanel, type SmartPurchaseItem } from "@/components/smart-purchase-panel";
import { date, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { cancelPurchaseAction } from "../actions/finance";

export default async function PurchasesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await connection();
  const { q } = await searchParams;
  const search = q?.trim() ?? "";

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [purchases, suppliers, variants, recentItems] = await Promise.all([
    prisma.purchase.findMany({
      where: search ? {
        OR: [
          { code: { contains: search, mode: "insensitive" } },
          { supplier: { name: { contains: search, mode: "insensitive" } } }
        ]
      } : undefined,
      include: { supplier: true, items: { include: { variant: { include: { product: true } } } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.productVariant.findMany({ include: { product: true }, orderBy: { sku: "asc" } }),
    prisma.orderItem.findMany({
      where: {
        variantId: { not: null },
        order: { status: { not: "CANCELED" }, createdAt: { gte: thirtyDaysAgo } }
      },
      select: { variantId: true, quantity: true }
    })
  ]);

  const sold30 = new Map<string, number>();
  for (const item of recentItems) {
    if (!item.variantId) continue;
    sold30.set(item.variantId, (sold30.get(item.variantId) ?? 0) + item.quantity);
  }

  const smartPurchaseItems: SmartPurchaseItem[] = variants.map((variant) => {
    const sold = sold30.get(variant.id) ?? 0;
    const suggestedQty = Math.max(0, Math.ceil((sold / 30) * 21) - variant.stockQuantity, variant.minStock * 2 - variant.stockQuantity);
    const status: SmartPurchaseItem["status"] =
      variant.stockQuantity <= variant.minStock && (sold > 0 || variant.stockQuantity === 0)
        ? "buy"
        : sold > 0
          ? "watch"
          : variant.stockQuantity > variant.minStock
            ? "avoid"
            : "watch";
    return {
      variantId: variant.id,
      productName: variant.product.name,
      sku: variant.sku,
      color: variant.color,
      size: variant.size,
      stock: variant.stockQuantity,
      minStock: variant.minStock,
      sold30: sold,
      suggestedQty: Math.max(1, suggestedQty),
      status
    };
  }).sort((a, b) => {
    const rank = { buy: 3, watch: 2, avoid: 1 };
    return rank[b.status] - rank[a.status] || b.sold30 - a.sold30 || a.stock - b.stock;
  });

  return (
    <AnimatedShell className="grid gap-6">
      <PageHeader
        title="Compras"
        description="Área preparada para compras de fornecedor, recebimento e entrada automática de mercadoria."
      />
      <SmartPurchasePanel items={smartPurchaseItems} />

      <section className="grid items-start gap-5 xl:grid-cols-[.72fr_1.28fr]">
        <ResponsiveFormPanel title="Nova compra">
          <PurchaseForm suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))} variants={variants.map((v) => ({ id: v.id, sku: v.sku, color: v.color, size: v.size, stockQuantity: v.stockQuantity, productName: v.product.name }))} />
        </ResponsiveFormPanel>

        <div className="surface-card relative overflow-hidden p-5">
          <span className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-accent/15 blur-3xl" />
          <span className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-warning to-accent text-fg">
              <Sparkles size={18} strokeWidth={2.1} />
            </span>
            <div>
              <p className="eyebrow">Fluxo</p>
              <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-fg">Automação de compras</h2>
            </div>
          </div>
          <p className="relative mt-4 text-[0.92rem] font-normal leading-6 text-muted">
            Ao receber mercadoria, o sistema aumenta o estoque, atualiza o custo unitário e registra a saída como gasto financeiro.
          </p>
          <ul className="relative mt-4 grid gap-2 text-[0.82rem] font-normal text-muted">
            <li className="flex items-center gap-2"><ArrowDownToLine size={14} className="text-success" /> Entrada automática nas variações</li>
            <li className="flex items-center gap-2"><ArrowDownToLine size={14} className="text-success" /> Atualização do custo médio</li>
            <li className="flex items-center gap-2"><ArrowDownToLine size={14} className="text-success" /> Lançamento de despesa no caixa</li>
          </ul>
        </div>
      </section>

      <div className="grid gap-3">
      <form method="GET" className="grid gap-2 sm:flex">
        <input className="field flex-1" name="q" type="search" placeholder="Buscar por código ou fornecedor..." defaultValue={search} />
        <button type="submit" className="button-primary px-4">Buscar</button>
        {search && <a href="/compras" className="flex min-h-10 items-center justify-center rounded-xl border border-border px-3 text-sm text-muted hover:text-fg">Limpar</a>}
      </form>
      <div className="table-shell overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Fornecedor</th>
              <th>Itens</th>
              <th className="text-right">Frete</th>
              <th className="text-right">Total</th>
              <th>Data</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {purchases.length ? (
              purchases.map((purchase) => (
                <>
                  <tr key={purchase.id}>
                    <td className="font-semibold text-fg">{purchase.code}</td>
                    <td className="max-w-[14rem] truncate">{purchase.supplier?.name ?? "-"}</td>
                    <td><span className="chip">{purchase.items.length}</span></td>
                    <td className="whitespace-nowrap text-right text-muted">{money(purchase.freight)}</td>
                    <td className="whitespace-nowrap text-right font-semibold text-fg">{money(purchase.total)}</td>
                    <td className="whitespace-nowrap text-muted">{date(purchase.createdAt)}</td>
                    <td className="whitespace-nowrap">
                      <form action={cancelPurchaseAction}>
                        <input type="hidden" name="id" value={purchase.id} />
                        <DeleteButton
                          confirmMessage={`Cancelar a compra ${purchase.code}? O estoque será revertido e o lançamento financeiro removido.`}
                          className="grid h-7 w-7 place-items-center rounded-lg text-muted transition hover:bg-danger-soft hover:text-danger"
                        />
                      </form>
                    </td>
                  </tr>
                  {/* detail row */}
                  {purchase.items.map((item) => (
                    <tr key={item.id} className="bg-surface-2/30">
                      <td className="pl-8 text-[0.76rem] text-muted" colSpan={2}>
                        ↳ {item.variant ? `${item.variant.product.name} · ${item.variant.color}/${item.variant.size} · ${item.variant.sku}` : "Item avulso"}
                      </td>
                      <td className="text-[0.76rem] text-muted"><span className="chip">{item.quantity} un.</span></td>
                      <td className="text-right text-[0.76rem] text-muted">{money(item.unitCost)} /un.</td>
                      <td className="text-right text-[0.76rem] font-semibold text-fg">{money(Number(item.unitCost) * item.quantity)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  ))}
                </>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-10 text-center text-muted">Nenhuma compra registrada ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </div>
    </AnimatedShell>
  );
}
