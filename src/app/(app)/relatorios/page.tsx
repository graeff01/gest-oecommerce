import { BarChart3, PiggyBank, TrendingUp, Warehouse } from "lucide-react";
import { connection } from "next/server";
import { AnimatedShell } from "@/components/animated-shell";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function ReportsPage() {
  await connection();
  const [orders, variants, transactions] = await Promise.all([
    prisma.order.findMany({ include: { items: { include: { variant: { include: { product: true } } } } } }),
    prisma.productVariant.findMany({ include: { product: true }, orderBy: { stockQuantity: "asc" } }),
    prisma.financialTransaction.findMany()
  ]);

  const salesTotal = orders.reduce((sum, order) => sum + Number(order.total), 0);
  const cost = orders
    .flatMap((order) => order.items)
    .reduce((sum, item) => sum + Number(item.costPrice) * item.quantity, 0);
  const expenses = transactions
    .filter((item) => item.type === "EXPENSE")
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const stockValue = variants.reduce((sum, variant) => sum + Number(variant.costPrice) * variant.stockQuantity, 0);

  const productRanking = new Map<string, { name: string; quantity: number; total: number }>();
  for (const order of orders) {
    for (const item of order.items) {
      const current =
        productRanking.get(item.variant.product.id) ?? { name: item.variant.product.name, quantity: 0, total: 0 };
      current.quantity += item.quantity;
      current.total += Number(item.unitPrice) * item.quantity;
      productRanking.set(item.variant.product.id, current);
    }
  }
  const ranking = [...productRanking.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 10);

  return (
    <AnimatedShell className="grid gap-6">
      <PageHeader
        title="Relatórios"
        description="Resumo gerencial de vendas, margem, estoque parado e performance por produto."
      />
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Faturamento" value={money(salesTotal)} detail="Total vendido" icon={BarChart3} tone="primary" />
        <MetricCard
          label="Margem bruta"
          value={money(salesTotal - cost)}
          detail="Venda menos custo"
          icon={TrendingUp}
          tone="success"
        />
        <MetricCard label="Gastos" value={money(expenses)} detail="Despesas totais" icon={PiggyBank} tone="danger" />
        <MetricCard label="Valor estoque" value={money(stockValue)} detail="Custo em mercadoria" icon={Warehouse} tone="warning" />
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        <div className="table-shell overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mais vendidos</th>
                <th>Qtd.</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {ranking.length ? (
                ranking.map((item) => (
                  <tr key={item.name}>
                    <td className="font-semibold text-fg">{item.name}</td>
                    <td>
                      <span className="chip">{item.quantity}</span>
                    </td>
                    <td className="text-right font-semibold text-fg">{money(item.total)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-muted">
                    Sem vendas para ranquear ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-shell overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Estoque crítico</th>
                <th>SKU</th>
                <th>Qtd.</th>
                <th>Mín.</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const critical = variants.filter((variant) => variant.stockQuantity <= variant.minStock);
                if (!critical.length) {
                  return (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-muted">
                        Estoque saudável — nenhuma variação abaixo do mínimo.
                      </td>
                    </tr>
                  );
                }
                return critical.map((variant) => (
                  <tr key={variant.id}>
                    <td className="font-semibold text-fg">{variant.product.name}</td>
                    <td className="text-muted">{variant.sku}</td>
                    <td>
                      <span className="status-pill pill-danger">{variant.stockQuantity}</span>
                    </td>
                    <td className="text-muted">{variant.minStock}</td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </section>
    </AnimatedShell>
  );
}
