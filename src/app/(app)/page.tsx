import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CircleDollarSign,
  ReceiptText,
  TrendingUp,
  UsersRound,
  Wallet
} from "lucide-react";
import { connection } from "next/server";
import { AnimatedShell } from "@/components/animated-shell";
import { DashboardGreeting } from "@/components/dashboard-greeting";
import { MetricCard } from "@/components/metric-card";
import { SalesChart } from "@/components/sales-chart";
import { getSession } from "@/lib/auth";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { getDashboardData } from "@/lib/dashboard";
import { firstName, money } from "@/lib/format";

export default async function DashboardPage() {
  await connection();
  const [data, user] = await Promise.all([getDashboardData(), getSession()]);
  const userName = user ? firstName(user.name) : "";

  return (
    <AnimatedShell className="grid h-full min-h-0 grid-rows-[auto_auto_1fr] gap-4 overflow-hidden">
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Visão geral</p>
          <DashboardGreeting name={userName} />
          <p className="mt-1.5 text-[0.92rem] font-normal text-muted">
            Vendas, caixa, margem e alertas principais — tudo em uma tela só.
          </p>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Saldo em caixa"
          value={money(data.metrics.currentBalance)}
          detail={data.metrics.currentBalance >= 0 ? "Caixa positivo" : "Caixa negativo"}
          icon={Wallet}
          tone={data.metrics.currentBalance >= 0 ? "success" : "danger"}
        />
        <MetricCard
          label="Vendas do mês"
          value={money(data.metrics.salesTotal)}
          detail="Pedidos pagos e ativos"
          icon={ReceiptText}
          tone="primary"
        />
        <MetricCard
          label="Receitas do mês"
          value={money(data.metrics.revenue)}
          detail="Entradas financeiras"
          icon={CircleDollarSign}
          tone="success"
        />
        <MetricCard
          label="Lucro estimado"
          value={money(data.metrics.profit)}
          detail="Venda menos custo e despesas"
          icon={TrendingUp}
          tone="warning"
        />
      </section>

      <section className="grid min-h-0 gap-4 xl:grid-cols-[1.45fr_.85fr]">
        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4">
          <div className="surface-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="eyebrow">Performance</p>
                <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-fg">Vendas recentes</h2>
                <p className="text-[0.78rem] font-normal text-muted">Últimos 7 dias</p>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                <Activity size={17} strokeWidth={2.1} />
              </span>
            </div>
            <SalesChart data={data.chart} compact />
          </div>

          <div className="grid min-h-0 gap-4 xl:grid-cols-[.72fr_1.28fr]">
            <div className="surface-card relative overflow-hidden p-5">
              <span className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-success/10 blur-2xl" />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="eyebrow">Base</p>
                  <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-fg">Clientes</h2>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-success-soft text-success">
                  <UsersRound size={17} strokeWidth={2.1} />
                </span>
              </div>
              <strong className="relative mt-5 block font-display text-[2.6rem] font-bold leading-none tracking-tight text-fg">
                {data.metrics.customers}
              </strong>
              <p className="relative mt-2 text-[0.78rem] font-normal text-muted">
                Use o histórico para campanhas de recompra.
              </p>
            </div>

            <div className="table-shell min-h-0 overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Status</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.length ? (
                    data.recentOrders.slice(0, 3).map((order) => (
                      <tr key={order.id}>
                        <td className="font-semibold text-fg">{order.code}</td>
                        <td>{order.customer?.name ?? "Venda avulsa"}</td>
                        <td>
                          <span className="status-pill">{ORDER_STATUS_LABELS[order.status] ?? order.status}</span>
                        </td>
                        <td className="text-right font-semibold text-fg">{money(order.total)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted">
                        Nenhum pedido registrado ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="surface-card relative min-h-0 overflow-hidden p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="eyebrow">Atenção</p>
              <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-fg">Reposição</h2>
              <p className="text-[0.78rem] font-normal text-muted">Itens críticos</p>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-danger-soft text-danger">
              <AlertTriangle size={17} strokeWidth={2.1} />
            </span>
          </div>
          <div className="grid gap-2 overflow-hidden">
            {data.lowStock.length ? (
              data.lowStock.slice(0, 6).map((variant) => (
                <div
                  key={variant.id}
                  className="group flex items-start justify-between gap-3 rounded-xl border border-border bg-surface-2/50 p-3 transition hover:border-danger/30 hover:bg-danger-soft/40"
                >
                  <div className="min-w-0">
                    <strong className="block truncate text-[0.85rem] font-semibold text-fg">
                      {variant.product.name}
                    </strong>
                    <p className="mt-0.5 truncate text-[0.72rem] font-normal text-muted">
                      {variant.color} · {variant.size} · {variant.sku}
                    </p>
                  </div>
                  <span className="status-pill pill-danger shrink-0">{variant.stockQuantity} un.</span>
                </div>
              ))
            ) : (
              <div className="grid place-items-center gap-2 rounded-xl border border-dashed border-border bg-surface-2/40 p-6 text-center">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-success-soft text-success">
                  <ArrowUpRight size={18} />
                </span>
                <p className="text-[0.85rem] font-medium text-fg">Estoque saudável</p>
                <p className="text-[0.74rem] font-normal text-muted">Nenhum alerta de reposição agora.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </AnimatedShell>
  );
}
