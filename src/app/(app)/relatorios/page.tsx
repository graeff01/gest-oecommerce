import { BarChart3, Download, PiggyBank, TrendingUp, Warehouse } from "lucide-react";
import { connection } from "next/server";
import { AnimatedShell } from "@/components/animated-shell";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { money, startOfDayBRT, endOfDayBRT } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function monthRange(offset: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await connection();
  const { from, to } = await searchParams;

  const dateFilter = from || to ? {
    createdAt: {
      ...(from ? { gte: startOfDayBRT(from) } : {}),
      ...(to ? { lte: endOfDayBRT(to) } : {})
    }
  } : {};

  const orderFilter = { ...dateFilter, status: { not: "CANCELED" as const } };

  // mês atual e anterior para comparativo
  const currMonth = monthRange(0);
  const prevMonth = monthRange(-1);

  const [orders, variants, transactions, currMonthOrders, prevMonthOrders] = await Promise.all([
    prisma.order.findMany({ where: orderFilter, include: { items: { include: { variant: { include: { product: true } } } } } }),
    prisma.productVariant.findMany({ include: { product: true }, orderBy: { stockQuantity: "asc" } }),
    prisma.financialTransaction.findMany({ where: { deletedAt: null, ...dateFilter } }),
    prisma.order.findMany({
      where: { status: { not: "CANCELED" }, createdAt: { gte: currMonth.start, lte: currMonth.end } },
      select: { total: true, channel: true }
    }),
    prisma.order.findMany({
      where: { status: { not: "CANCELED" }, createdAt: { gte: prevMonth.start, lte: prevMonth.end } },
      select: { total: true, channel: true }
    })
  ]);

  const salesTotal = orders.reduce((sum, o) => sum + Number(o.total), 0);
  const cost = orders.flatMap((o) => o.items).reduce((sum, i) => sum + Number(i.costPrice) * i.quantity, 0);
  const expenses = transactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);
  const stockValue = variants.reduce((s, v) => s + Number(v.costPrice) * v.stockQuantity, 0);

  // ranking de produtos (itens avulsos agrupados pelo label)
  const productRanking = new Map<string, { name: string; quantity: number; total: number }>();
  for (const order of orders) {
    for (const item of order.items) {
      const key = item.variant ? item.variant.product.id : `manual:${item.label ?? "avulso"}`;
      const name = item.variant ? item.variant.product.name : (item.label ?? "Item avulso");
      const cur = productRanking.get(key) ?? { name, quantity: 0, total: 0 };
      cur.quantity += item.quantity;
      cur.total += Number(item.unitPrice) * item.quantity;
      productRanking.set(key, cur);
    }
  }
  const ranking = [...productRanking.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 10);

  // ranking por canal
  const channelMap = new Map<string, { total: number; count: number }>();
  for (const o of orders) {
    const cur = channelMap.get(o.channel) ?? { total: 0, count: 0 };
    cur.total += Number(o.total);
    cur.count += 1;
    channelMap.set(o.channel, cur);
  }
  const channelRanking = [...channelMap.entries()]
    .map(([channel, data]) => ({ channel, ...data }))
    .sort((a, b) => b.total - a.total);

  // comparativo mês a mês
  const currTotal = currMonthOrders.reduce((s, o) => s + Number(o.total), 0);
  const prevTotal = prevMonthOrders.reduce((s, o) => s + Number(o.total), 0);
  const diff = currTotal - prevTotal;
  const diffPct = prevTotal > 0 ? ((diff / prevTotal) * 100).toFixed(1) : null;

  const currMonthLabel = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const prevMonthLabel = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <AnimatedShell className="grid gap-6">
      <PageHeader
        title="Relatórios"
        description="Resumo gerencial de vendas, margem, estoque parado e performance por produto."
      />
      {/* export buttons */}
      <div className="flex flex-wrap gap-2">
        {(["products", "channels", "stock"] as const).map((sheet) => {
          const labels = { products: "Produtos mais vendidos", channels: "Por canal de venda", stock: "Estoque atual" };
          const params = new URLSearchParams();
          params.set("sheet", sheet);
          if (from) params.set("from", from);
          if (to) params.set("to", to);
          return (
            <a
              key={sheet}
              href={`/api/export/reports?${params.toString()}`}
              download
              className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-muted transition hover:text-fg"
            >
              <Download size={14} />
              {labels[sheet]}
            </a>
          );
        })}
      </div>

      <form method="GET" className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4">
        <label className="label w-full min-w-[140px] flex-1 sm:w-auto">
          De<input className="field" name="from" type="date" defaultValue={from ?? ""} />
        </label>
        <label className="label w-full min-w-[140px] flex-1 sm:w-auto">
          Até<input className="field" name="to" type="date" defaultValue={to ?? ""} />
        </label>
        <div className="flex w-full gap-2 sm:w-auto sm:self-end">
          <button type="submit" className="button-primary h-10 flex-1 px-4 sm:flex-none">Filtrar</button>
          {(from || to) && (
            <a href="/relatorios" className="flex h-10 flex-1 items-center justify-center rounded-xl border border-border px-4 text-sm text-muted hover:text-fg sm:flex-none">Limpar</a>
          )}
        </div>
      </form>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Faturamento" value={money(salesTotal)} detail="Total vendido" icon={BarChart3} tone="primary" />
        <MetricCard label="Margem bruta" value={money(salesTotal - cost)} detail="Venda menos custo" icon={TrendingUp} tone="success" />
        <MetricCard label="Gastos" value={money(expenses)} detail="Despesas totais" icon={PiggyBank} tone="danger" />
        <MetricCard label="Valor estoque" value={money(stockValue)} detail="Custo em mercadoria" icon={Warehouse} tone="warning" />
      </section>

      {/* comparativo mês a mês — sempre visível, independente do filtro */}
      <section className="surface-card grid gap-4 p-5">
        <div>
          <p className="text-[0.74rem] font-semibold uppercase tracking-wide text-muted">Comparativo mensal</p>
          <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-fg">Mês a mês — faturamento</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface-2/40 p-4">
            <p className="text-[0.74rem] text-muted capitalize">{prevMonthLabel}</p>
            <p className="mt-1 font-display text-xl font-semibold text-fg">{money(prevTotal)}</p>
            <p className="mt-1 text-[0.74rem] text-muted">{prevMonthOrders.length} pedidos</p>
          </div>
          <div className="rounded-xl border border-primary/25 bg-primary-soft p-4">
            <p className="text-[0.74rem] text-muted capitalize">{currMonthLabel} (atual)</p>
            <p className="mt-1 font-display text-xl font-semibold text-fg">{money(currTotal)}</p>
            <p className="mt-1 text-[0.74rem] text-muted">{currMonthOrders.length} pedidos</p>
          </div>
          <div className={`rounded-xl border p-4 ${diff >= 0 ? "border-success/25 bg-success-soft/50" : "border-danger/25 bg-danger-soft/50"}`}>
            <p className="text-[0.74rem] text-muted">Variação</p>
            <p className={`mt-1 font-display text-xl font-semibold ${diff >= 0 ? "text-success" : "text-danger"}`}>
              {diff >= 0 ? "+" : ""}{money(diff)}
            </p>
            {diffPct !== null && (
              <p className={`mt-1 text-[0.74rem] font-semibold ${diff >= 0 ? "text-success" : "text-danger"}`}>
                {diff >= 0 ? "▲" : "▼"} {Math.abs(Number(diffPct))}% em relação ao mês anterior
              </p>
            )}
            {diffPct === null && <p className="mt-1 text-[0.74rem] text-muted">Sem dados do mês anterior</p>}
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        {/* ranking de produtos */}
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
                    <td className="max-w-[18rem] truncate font-semibold text-fg">{item.name}</td>
                    <td><span className="chip">{item.quantity}</span></td>
                    <td className="text-right font-semibold text-fg">{money(item.total)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={3} className="py-10 text-center text-muted">Sem vendas para ranquear ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ranking por canal */}
        <div className="table-shell overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Canal de venda</th>
                <th>Pedidos</th>
                <th className="text-right">Faturamento</th>
              </tr>
            </thead>
            <tbody>
              {channelRanking.length ? (
                channelRanking.map((item) => (
                  <tr key={item.channel}>
                    <td className="max-w-[16rem] truncate font-semibold text-fg">{item.channel}</td>
                    <td><span className="chip">{item.count}</span></td>
                    <td className="text-right font-semibold text-fg">{money(item.total)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={3} className="py-10 text-center text-muted">Nenhuma venda registrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* estoque crítico */}
      <section className="table-shell overflow-x-auto">
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
              const critical = variants.filter((v) => v.stockQuantity <= v.minStock);
              if (!critical.length) return (
                <tr><td colSpan={4} className="py-10 text-center text-muted">Estoque saudável — nenhuma variação abaixo do mínimo.</td></tr>
              );
              return critical.map((v) => (
                <tr key={v.id}>
                  <td className="max-w-[14rem] truncate font-semibold text-fg">{v.product.name}</td>
                  <td className="max-w-[8rem] truncate text-muted">{v.sku}</td>
                  <td><span className="status-pill pill-danger">{v.stockQuantity}</span></td>
                  <td className="text-muted">{v.minStock}</td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </section>
    </AnimatedShell>
  );
}
