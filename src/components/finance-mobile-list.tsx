"use client";

import { CheckCircle2, Clock, Trash2 } from "lucide-react";
import { deleteFinancialTransactionAction, markFinancialTransactionPaidAction } from "@/app/(app)/actions/finance";
import { date, money } from "@/lib/format";

type Transaction = {
  id: string;
  type: "REVENUE" | "EXPENSE";
  title: string;
  category: string;
  amount: number;
  paidAt: string | null;
  dueDate: string | null;
};

export function FinanceMobileList({ transactions }: { transactions: Transaction[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!transactions.length) {
    return <div className="surface-card p-6 text-center text-muted md:hidden">Nenhum lancamento financeiro registrado.</div>;
  }

  return (
    <div className="grid gap-3 md:hidden">
      {transactions.map((item) => {
        const due = item.dueDate ? new Date(item.dueDate) : null;
        if (due) due.setHours(0, 0, 0, 0);
        const overdue = Boolean(due && due < today && !item.paidAt);
        return (
          <article key={item.id} className={`surface-card p-4 ${overdue ? "ring-1 ring-danger/25" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className={item.type === "REVENUE" ? "status-pill" : "status-pill pill-danger"}>
                  {item.type === "REVENUE" ? "Receita" : "Gasto"}
                </span>
                <h3 className="mt-2 truncate font-display text-base font-semibold text-fg">{item.title}</h3>
                <p className="mt-1 truncate text-[0.76rem] text-muted">{item.category}</p>
              </div>
              <p className="shrink-0 text-right font-display text-lg font-semibold text-fg">{money(item.amount)}</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-border bg-surface-2/35 p-3">
                <p className="text-[0.66rem] font-semibold uppercase tracking-wide text-muted">Pago</p>
                <p className="mt-1 text-[0.8rem] font-semibold text-fg">{date(item.paidAt)}</p>
              </div>
              <div className={`rounded-xl border p-3 ${overdue ? "border-danger/20 bg-danger-soft/45" : "border-border bg-surface-2/35"}`}>
                <p className="text-[0.66rem] font-semibold uppercase tracking-wide text-muted">Vencimento</p>
                <p className={`mt-1 text-[0.8rem] font-semibold ${overdue ? "text-danger" : "text-fg"}`}>{date(item.dueDate)}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
              {!item.paidAt ? (
                <form action={markFinancialTransactionPaidAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <button className="button-primary min-h-10 text-xs">
                    <CheckCircle2 size={14} />
                    Marcar pago
                  </button>
                </form>
              ) : (
                <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-success/20 bg-success-soft px-3 text-xs font-semibold text-success">
                  <Clock size={14} />
                  Liquidado
                </span>
              )}
              <form action={deleteFinancialTransactionAction}>
                <input type="hidden" name="id" value={item.id} />
                <button className="grid h-10 w-10 place-items-center rounded-xl border border-border text-muted" title="Excluir">
                  <Trash2 size={14} />
                </button>
              </form>
            </div>
          </article>
        );
      })}
    </div>
  );
}
