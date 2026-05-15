import { CalendarDays, Wallet } from "lucide-react";
import { InstallmentsTable } from "@/components/installments-table";
import { connection } from "next/server";
import { AnimatedShell } from "@/components/animated-shell";
import { PageHeader } from "@/components/page-header";
import { date, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function CreditPage() {
  await connection();

  const orders = await prisma.order.findMany({
    include: {
      installments: { where: { paidAt: null } },
      customer: true
    },
    where: { installments: { some: { paidAt: null } } }
  });

  const openInstallments = orders
    .flatMap((o) =>
      o.installments.map((i) => ({
        ...i,
        orderCode: o.code,
        customerName: o.customer?.name ?? "Cliente avulso",
        customerPhone: o.customer?.phone ?? null
      }))
    )
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const scheduleMap = new Map<string, { total: number; count: number; overdue: boolean }>();
  for (const inst of openInstallments) {
    const due = new Date(inst.dueDate);
    due.setHours(0, 0, 0, 0);
    const key = due.toISOString().slice(0, 10);
    const overdue = due < today;
    const existing = scheduleMap.get(key);
    if (existing) {
      existing.total += Number(inst.amount);
      existing.count += 1;
    } else {
      scheduleMap.set(key, { total: Number(inst.amount), count: 1, overdue });
    }
  }

  const scheduleEntries = Array.from(scheduleMap.entries()).sort(([a], [b]) => {
    const da = new Date(a).getTime();
    const db = new Date(b).getTime();
    const todayTs = today.getTime();
    const aOver = da < todayTs;
    const bOver = db < todayTs;
    if (aOver && !bOver) return -1;
    if (!aOver && bOver) return 1;
    return aOver ? db - da : da - db;
  });

  const scheduleTotal = scheduleEntries.reduce((s, [, { total }]) => s + total, 0);
  const overdueTotal = scheduleEntries
    .filter(([, { overdue }]) => overdue)
    .reduce((s, [, { total }]) => s + total, 0);

  return (
    <AnimatedShell className="grid gap-6">
      <PageHeader
        title="Crediário"
        description="Agenda de recebimentos por dia e controle de parcelas em aberto."
      />

      {/* agenda de recebimentos */}
      {scheduleEntries.length > 0 && (
        <section className="surface-card grid gap-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-2 text-primary-fg shadow-glow">
                <CalendarDays size={17} strokeWidth={2.1} />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Agenda de recebimentos</h2>
                <p className="text-[0.76rem] font-normal text-muted">Previsão por dia com base nas parcelas em aberto.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-xl border border-border bg-surface-2/40 px-4 py-2.5">
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted">Total a receber</p>
                <p className="mt-0.5 font-display text-lg font-bold text-fg">{money(scheduleTotal)}</p>
              </div>
              {overdueTotal > 0 && (
                <div className="rounded-xl border border-danger/25 bg-danger-soft px-4 py-2.5">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-danger">Em atraso</p>
                  <p className="mt-0.5 font-display text-lg font-bold text-danger">{money(overdueTotal)}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {scheduleEntries.map(([dateKey, { total, count, overdue }]) => {
              const d = new Date(dateKey + "T12:00:00");
              const isToday = dateKey === today.toISOString().slice(0, 10);
              return (
                <div
                  key={dateKey}
                  className={`flex min-w-[8rem] flex-1 flex-col gap-1 rounded-xl border px-4 py-3 ${
                    overdue
                      ? "border-danger/25 bg-danger-soft"
                      : isToday
                        ? "border-success/30 bg-success-soft"
                        : "border-border bg-surface-2/40"
                  }`}
                >
                  <span className={`text-[0.7rem] font-semibold uppercase tracking-wide ${overdue ? "text-danger" : isToday ? "text-success" : "text-muted"}`}>
                    {overdue ? "Vencido · " : isToday ? "Hoje · " : ""}
                    {d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                  </span>
                  <span className="font-display text-base font-semibold text-fg">{money(total)}</span>
                  <span className="text-[0.72rem] text-muted">{count} {count === 1 ? "parcela" : "parcelas"}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {scheduleEntries.length === 0 && (
        <div className="surface-card flex flex-col items-center gap-3 p-10 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-2 text-primary-fg shadow-glow">
            <CalendarDays size={20} strokeWidth={2} />
          </span>
          <p className="font-display text-base font-semibold text-fg">Nenhum recebimento pendente</p>
          <p className="text-[0.84rem] text-muted">Todas as parcelas estão em dia.</p>
        </div>
      )}

      {/* crediário em aberto */}
      <section className="surface-card grid gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-warning to-warning/70 text-primary-fg">
            <Wallet size={17} strokeWidth={2.1} />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Crediário em aberto</h2>
            <p className="text-[0.76rem] font-normal text-muted">Selecione várias parcelas para marcar como pagas de uma vez.</p>
          </div>
        </div>
        <InstallmentsTable
          installments={openInstallments.map((i) => ({
            ...i,
            amount: Number(i.amount),
            dueDate: i.dueDate instanceof Date ? i.dueDate.toISOString() : String(i.dueDate),
            customerPhone: i.customerPhone ?? null
          }))}
        />
      </section>
    </AnimatedShell>
  );
}
