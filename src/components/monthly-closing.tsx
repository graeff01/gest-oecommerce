import { AlertTriangle, Boxes, CheckCircle2, PiggyBank, TrendingUp, Wallet } from "lucide-react";
import { money } from "@/lib/format";

export function MonthlyClosing({
  revenue,
  expenses,
  productCost,
  stockValue,
  receivable,
  overdue,
  profit
}: {
  revenue: number;
  expenses: number;
  productCost: number;
  stockValue: number;
  receivable: number;
  overdue: number;
  profit: number;
}) {
  const ownerDraw = Math.max(0, profit * 0.35);
  const reserve = Math.max(0, profit * 0.25);

  return (
    <section className="surface-card overflow-hidden">
      <div className="border-b border-border p-5">
        <p className="eyebrow">Fechamento mensal</p>
        <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-fg">Resumo simples do mes</h2>
        <p className="mt-1 text-[0.82rem] text-muted">Para saber se sobrou dinheiro ou se so houve movimento.</p>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4 xl:p-5">
        <div className="rounded-xl border border-success/20 bg-success-soft/35 p-4">
          <TrendingUp size={18} className="text-success" />
          <p className="mt-3 text-[0.7rem] font-semibold uppercase tracking-wide text-muted">Faturamento</p>
          <p className="mt-1 font-display text-xl font-semibold text-fg">{money(revenue)}</p>
        </div>
        <div className="rounded-xl border border-warning/20 bg-warning-soft/35 p-4">
          <PiggyBank size={18} className="text-warning" />
          <p className="mt-3 text-[0.7rem] font-semibold uppercase tracking-wide text-muted">Custo + gastos</p>
          <p className="mt-1 font-display text-xl font-semibold text-fg">{money(productCost + expenses)}</p>
        </div>
        <div className={`rounded-xl border p-4 ${profit >= 0 ? "border-primary/20 bg-primary-soft/35" : "border-danger/20 bg-danger-soft/45"}`}>
          <Wallet size={18} className={profit >= 0 ? "text-primary" : "text-danger"} />
          <p className="mt-3 text-[0.7rem] font-semibold uppercase tracking-wide text-muted">Lucro estimado</p>
          <p className="mt-1 font-display text-xl font-semibold text-fg">{money(profit)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-2/35 p-4">
          <Boxes size={18} className="text-muted" />
          <p className="mt-3 text-[0.7rem] font-semibold uppercase tracking-wide text-muted">Parado em estoque</p>
          <p className="mt-1 font-display text-xl font-semibold text-fg">{money(stockValue)}</p>
        </div>
      </div>

      <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-3 xl:p-5">
        <div className="rounded-xl border border-border bg-surface-2/35 p-4">
          <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted">A receber</p>
          <p className="mt-1 font-display text-lg font-semibold text-fg">{money(receivable)}</p>
          <p className="mt-1 text-[0.74rem] text-muted">{overdue > 0 ? `${money(overdue)} vencido` : "sem atraso relevante"}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-2/35 p-4">
          <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted">Retirada sugerida</p>
          <p className="mt-1 font-display text-lg font-semibold text-fg">{money(ownerDraw)}</p>
          <p className="mt-1 text-[0.74rem] text-muted">35% do lucro estimado</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-2/35 p-4">
          <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted">Reserva sugerida</p>
          <p className="mt-1 font-display text-lg font-semibold text-fg">{money(reserve)}</p>
          <p className="mt-1 text-[0.74rem] text-muted">para compra e imprevistos</p>
        </div>
      </div>

      <div className="border-t border-border p-4 xl:p-5">
        {profit >= 0 ? (
          <p className="flex items-start gap-2 rounded-xl border border-success/20 bg-success-soft/35 p-3 text-[0.82rem] font-semibold text-success">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            Mes positivo. Antes de retirar tudo, proteja caixa e reposicao.
          </p>
        ) : (
          <p className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-soft/45 p-3 text-[0.82rem] font-semibold text-danger">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            Mes negativo. Revise gastos, precificacao e estoque parado.
          </p>
        )}
      </div>
    </section>
  );
}
