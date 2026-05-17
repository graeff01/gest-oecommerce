import { CalendarDays, Clock, MessageCircle, TrendingDown, Users, Wallet } from "lucide-react";
import { InstallmentsTable } from "@/components/installments-table";
import { connection } from "next/server";
import { AnimatedShell } from "@/components/animated-shell";
import { PageHeader } from "@/components/page-header";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { buildCollectionMessage, whatsappUrl } from "@/lib/whatsapp";

function sumDecimal(values: number[]): number {
  // soma centavo a centavo para evitar erros de ponto flutuante
  const cents = values.reduce((acc, v) => acc + Math.round(v * 100), 0);
  return cents / 100;
}

export default async function CreditPage() {
  await connection();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // busca todas as parcelas abertas com dados do pedido e cliente num único query
  const openInstallmentsRaw = await prisma.installment.findMany({
    where: { paidAt: null },
    include: {
      order: {
        select: {
          code: true,
          customer: { select: { name: true, phone: true } }
        }
      }
    },
    orderBy: { dueDate: "asc" }
  });

  const openInstallments = openInstallmentsRaw.map((i) => ({
    id: i.id,
    sequence: i.sequence,
    totalCount: i.totalCount,
    dueDate: i.dueDate,
    amount: Number(i.amount),
    orderCode: i.order.code,
    customerName: i.order.customer?.name ?? "Cliente avulso",
    customerPhone: i.order.customer?.phone ?? null
  }));

  // --- cálculos precisos ---
  const totalOpen = sumDecimal(openInstallments.map((i) => i.amount));

  const overdueInstallments = openInstallments.filter((i) => {
    const due = new Date(i.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  });
  const totalOverdue = sumDecimal(overdueInstallments.map((i) => i.amount));

  const todayKey = today.toISOString().slice(0, 10);
  const todayInstallments = openInstallments.filter((i) => {
    const due = new Date(i.dueDate);
    due.setHours(0, 0, 0, 0);
    return due.toISOString().slice(0, 10) === todayKey;
  });
  const totalToday = sumDecimal(todayInstallments.map((i) => i.amount));

  // clientes únicos com dívida
  const debtorCount = new Set(openInstallments.map((i) => i.customerName)).size;
  const collectionQueue = [
    ...overdueInstallments.map((item) => ({ ...item, tone: "danger" as const, label: "Vencida" })),
    ...todayInstallments.map((item) => ({ ...item, tone: "warning" as const, label: "Vence hoje" })),
    ...openInstallments
      .filter((item) => !overdueInstallments.some((overdue) => overdue.id === item.id) && !todayInstallments.some((todayItem) => todayItem.id === item.id))
      .slice(0, 4)
      .map((item) => ({ ...item, tone: "primary" as const, label: "Proxima" }))
  ].slice(0, 6);

  // próximo vencimento (futuro mais próximo)
  const nextDue = openInstallments.find((i) => {
    const due = new Date(i.dueDate);
    due.setHours(0, 0, 0, 0);
    return due >= today;
  });

  // agenda agrupada por dia
  const scheduleMap = new Map<string, { total: number; count: number; overdue: boolean }>();
  for (const inst of openInstallments) {
    const due = new Date(inst.dueDate);
    due.setHours(0, 0, 0, 0);
    const key = due.toISOString().slice(0, 10);
    const overdue = due < today;
    const existing = scheduleMap.get(key);
    if (existing) {
      existing.total = sumDecimal([existing.total, inst.amount]);
      existing.count += 1;
    } else {
      scheduleMap.set(key, { total: inst.amount, count: 1, overdue });
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

  return (
    <AnimatedShell className="grid gap-6">
      <PageHeader
        title="Crediário"
        description="Agenda de recebimentos por dia e controle de parcelas em aberto."
      />

      {/* cards de resumo */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="surface-card flex items-center gap-4 p-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-2 text-primary-fg shadow-glow">
            <Wallet size={18} strokeWidth={2.1} />
          </span>
          <div className="min-w-0">
            <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted">Total em aberto</p>
            <p className="mt-0.5 font-display text-xl font-bold text-fg">{money(totalOpen)}</p>
            <p className="text-[0.72rem] text-muted">{openInstallments.length} {openInstallments.length === 1 ? "parcela" : "parcelas"}</p>
          </div>
        </div>

        <div className={`surface-card flex items-center gap-4 p-4 ${totalOverdue > 0 ? "ring-1 ring-danger/20" : ""}`}>
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${totalOverdue > 0 ? "bg-gradient-to-br from-danger to-danger/70" : "bg-surface-2"} text-primary-fg`}>
            <TrendingDown size={18} strokeWidth={2.1} />
          </span>
          <div className="min-w-0">
            <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted">Em atraso</p>
            <p className={`mt-0.5 font-display text-xl font-bold ${totalOverdue > 0 ? "text-danger" : "text-muted"}`}>
              {totalOverdue > 0 ? money(totalOverdue) : "Nenhum"}
            </p>
            <p className="text-[0.72rem] text-muted">
              {overdueInstallments.length > 0
                ? `${overdueInstallments.length} ${overdueInstallments.length === 1 ? "parcela vencida" : "parcelas vencidas"}`
                : "Tudo em dia"}
            </p>
          </div>
        </div>

        <div className="surface-card flex items-center gap-4 p-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-warning to-warning/70 text-primary-fg">
            <Clock size={18} strokeWidth={2.1} />
          </span>
          <div className="min-w-0">
            <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted">Vence hoje</p>
            <p className="mt-0.5 font-display text-xl font-bold text-fg">
              {totalToday > 0 ? money(totalToday) : <span className="text-muted text-base font-medium">Nenhuma hoje</span>}
            </p>
            <p className="text-[0.72rem] text-muted">
              {todayInstallments.length > 0
                ? `${todayInstallments.length} ${todayInstallments.length === 1 ? "parcela" : "parcelas"}`
                : nextDue
                  ? `Próx: ${new Date(nextDue.dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`
                  : ""}
            </p>
          </div>
        </div>

        <div className="surface-card flex items-center gap-4 p-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-success to-success/70 text-primary-fg">
            <Users size={18} strokeWidth={2.1} />
          </span>
          <div className="min-w-0">
            <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted">Clientes devedores</p>
            <p className="mt-0.5 font-display text-xl font-bold text-fg">{debtorCount}</p>
            <p className="text-[0.72rem] text-muted">
              {debtorCount === 0 ? "Nenhum devedor" : debtorCount === 1 ? "com parcela em aberto" : "com parcelas em aberto"}
            </p>
          </div>
        </div>
      </section>

      {collectionQueue.length > 0 && (
        <section className="surface-card overflow-hidden">
          <div className="border-b border-border p-5">
            <p className="eyebrow">Rotina de cobranca</p>
            <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-fg">Quem chamar agora</h2>
            <p className="mt-1 text-[0.8rem] text-muted">Prioridade automatica por atraso e vencimento do dia.</p>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3 xl:p-5">
            {collectionQueue.map((item) => {
              const message = buildCollectionMessage({
                customerName: item.customerName,
                amount: item.amount,
                dueDate: item.dueDate,
                reference: item.orderCode
              });
              const href = whatsappUrl(item.customerPhone, message);
              return (
                <article key={item.id} className="rounded-xl border border-border bg-surface-2/35 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className={item.tone === "danger" ? "status-pill pill-danger" : item.tone === "warning" ? "status-pill pill-warning" : "status-pill pill-primary"}>
                        {item.label}
                      </span>
                      <h3 className="mt-2 truncate font-display text-base font-semibold text-fg">{item.customerName}</h3>
                      <p className="mt-1 text-[0.78rem] text-muted">{item.orderCode} · {item.sequence}/{item.totalCount}</p>
                    </div>
                    <p className="shrink-0 text-right font-display text-lg font-semibold text-fg">{money(item.amount)}</p>
                  </div>
                  <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                    {href ? (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-success/25 bg-success-soft px-3 text-[0.78rem] font-semibold text-success">
                        <MessageCircle size={14} />
                        Cobrar
                      </a>
                    ) : (
                      <span className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-surface px-3 text-[0.78rem] font-semibold text-muted">Sem WhatsApp</span>
                    )}
                    <span className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-surface px-3 text-[0.78rem] font-semibold text-muted">
                      {new Date(item.dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* agenda de recebimentos */}
      {scheduleEntries.length > 0 && (
        <section className="surface-card grid gap-4 p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-2 text-primary-fg shadow-glow">
              <CalendarDays size={17} strokeWidth={2.1} />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Agenda de recebimentos</h2>
              <p className="text-[0.76rem] font-normal text-muted">Previsão por dia com base nas parcelas em aberto.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {scheduleEntries.map(([dateKey, { total, count, overdue }]) => {
              const d = new Date(dateKey + "T12:00:00");
              const isToday = dateKey === todayKey;
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
            dueDate: i.dueDate instanceof Date ? i.dueDate.toISOString() : String(i.dueDate)
          }))}
        />
      </section>
    </AnimatedShell>
  );
}
