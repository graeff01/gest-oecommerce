import { AlertTriangle, ArrowDownToLine, PackagePlus, Sparkles } from "lucide-react";
import { connection } from "next/server";
import { AnimatedShell } from "@/components/animated-shell";
import { PageHeader } from "@/components/page-header";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { createPurchaseAction } from "../actions/finance";

export default async function PurchasesPage() {
  await connection();
  const [purchases, suppliers, variants] = await Promise.all([
    prisma.purchase.findMany({
      include: { supplier: true, items: { include: { variant: { include: { product: true } } } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.productVariant.findMany({ include: { product: true }, orderBy: { sku: "asc" } })
  ]);

  return (
    <AnimatedShell className="grid gap-6">
      <PageHeader
        title="Compras"
        description="Área preparada para compras de fornecedor, recebimento e entrada automática de mercadoria."
      />
      <section className="grid items-start gap-5 xl:grid-cols-[.72fr_1.28fr]">
        <form action={createPurchaseAction} className="surface-card grid gap-4 p-5 xl:sticky xl:top-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-warning to-accent text-fg">
              <PackagePlus size={17} strokeWidth={2.1} />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Nova compra</h2>
              <p className="text-[0.76rem] font-normal text-muted">Reposição automatizada com entrada no estoque.</p>
            </div>
          </div>
          <label className="label">
            Fornecedor
            <select className="field" name="supplierId">
              <option value="">Sem fornecedor</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            Produto
            {variants.length === 0 ? (
              <div className="field flex items-center gap-2 text-muted">
                <AlertTriangle size={14} className="text-warning shrink-0" />
                Cadastre produtos primeiro em &ldquo;Produtos&rdquo;
              </div>
            ) : (
              <select className="field" name="variantId" required>
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.product.name} · {variant.color}/{variant.size} · {variant.sku} · {variant.stockQuantity} un.
                  </option>
                ))}
              </select>
            )}
          </label>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="label">
              Qtd.<input className="field" name="quantity" type="number" min="1" required />
            </label>
            <label className="label">
              Custo un.<input className="field" name="unitCost" type="number" min="0" step="0.01" required />
            </label>
            <label className="label">
              Frete<input className="field" name="freight" type="number" min="0" step="0.01" defaultValue="0" />
            </label>
          </div>
          <button className="button-primary">Receber mercadoria</button>
        </form>

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
            <li className="flex items-center gap-2">
              <ArrowDownToLine size={14} className="text-success" /> Entrada automática nas variações
            </li>
            <li className="flex items-center gap-2">
              <ArrowDownToLine size={14} className="text-success" /> Atualização do custo médio
            </li>
            <li className="flex items-center gap-2">
              <ArrowDownToLine size={14} className="text-success" /> Lançamento de despesa no caixa
            </li>
          </ul>
        </div>
      </section>

      <div className="table-shell overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Fornecedor</th>
              <th>Itens</th>
              <th className="text-right">Frete</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {purchases.length ? (
              purchases.map((purchase) => (
                <tr key={purchase.id}>
                  <td className="font-semibold text-fg">{purchase.code}</td>
                  <td className="max-w-[14rem] truncate">{purchase.supplier?.name ?? "-"}</td>
                  <td>
                    <span className="chip">{purchase.items.length}</span>
                  </td>
                  <td className="whitespace-nowrap text-right text-muted">{money(purchase.freight)}</td>
                  <td className="whitespace-nowrap text-right font-semibold text-fg">{money(purchase.total)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-10 text-center text-muted">
                  Nenhuma compra registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AnimatedShell>
  );
}
