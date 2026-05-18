"use client";

import { useState, useTransition } from "react";
import { CheckSquare2, ChevronDown, ChevronRight, MessageCircle, Square } from "lucide-react";
import { payInstallmentAction, payManyInstallmentsAction } from "@/app/(app)/actions/orders";
import { date, money } from "@/lib/format";

type Installment = {
  id: string;
  sequence: number;
  totalCount: number;
  dueDate: string | Date;
  amount: number;
  orderCode: string;
  customerName: string;
  customerPhone?: string | null;
};

function buildWhatsAppUrl(phone: string | null | undefined, installment: Installment): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  const dueDateStr = date(installment.dueDate);
  const message = `Olá ${installment.customerName}, tudo bem? Passando para lembrar que a parcela ${installment.sequence}/${installment.totalCount} de ${money(installment.amount)} vence em ${dueDateStr}. Qualquer dúvida estou à disposição! 😊`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

type CustomerGroup = {
  customerName: string;
  customerPhone: string | null | undefined;
  totalOwed: number;
  hasOverdue: boolean;
  installments: Installment[];
};

function groupByCustomer(installments: Installment[], today: Date): CustomerGroup[] {
  const map = new Map<string, CustomerGroup>();
  for (const i of installments) {
    const existing = map.get(i.customerName);
    const due = new Date(i.dueDate); due.setHours(0, 0, 0, 0);
    const overdue = due < today;
    if (existing) {
      existing.installments.push(i);
      existing.totalOwed += i.amount;
      if (overdue) existing.hasOverdue = true;
    } else {
      map.set(i.customerName, {
        customerName: i.customerName,
        customerPhone: i.customerPhone,
        totalOwed: i.amount,
        hasOverdue: overdue,
        installments: [i]
      });
    }
  }
  // ordena: inadimplentes primeiro, depois alfabético
  return [...map.values()].sort((a, b) => {
    if (a.hasOverdue && !b.hasOverdue) return -1;
    if (!a.hasOverdue && b.hasOverdue) return 1;
    return a.customerName.localeCompare(b.customerName);
  });
}

function CustomerCard({ group, today }: { group: CustomerGroup; today: Date }) {
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [payMethod, setPayMethod] = useState("PIX");
  const [isPending, startTransition] = useTransition();

  const allSelected = group.installments.length > 0 && selected.size === group.installments.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(group.installments.map((i) => i.id)));
  }

  function handleBulkPay() {
    if (selected.size === 0) return;
    const fd = new FormData();
    fd.set("installmentIds", JSON.stringify(Array.from(selected)));
    fd.set("paymentMethod", payMethod);
    startTransition(() => {
      payManyInstallmentsAction(fd).then(() => setSelected(new Set()));
    });
  }

  const whatsappHref = buildWhatsAppUrl(group.customerPhone, group.installments[0]);

  return (
    <div className={`overflow-hidden rounded-2xl border transition ${group.hasOverdue ? "border-danger/30" : "border-border"}`}>
      {/* header do cliente */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2/60 ${group.hasOverdue ? "bg-danger-soft/40" : "bg-surface-2/30"}`}
      >
        <span className="text-muted transition">{open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[0.95rem] font-semibold text-fg">{group.customerName}</span>
          <span className="text-[0.74rem] text-muted">
            {group.installments.length} {group.installments.length === 1 ? "parcela" : "parcelas"} em aberto
            {group.hasOverdue && <span className="ml-2 font-semibold text-danger">· com atraso</span>}
          </span>
        </span>
        <span className="shrink-0 font-display text-base font-semibold text-fg">{money(group.totalOwed)}</span>
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-success-soft hover:text-success"
            title="Cobrar via WhatsApp"
          >
            <MessageCircle size={14} strokeWidth={2.1} />
          </a>
        )}
      </button>

      {/* parcelas */}
      {open && (
        <div className="divide-y divide-border/60">
          {/* linha de seleção em lote */}
          {group.installments.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 bg-surface/40 px-4 py-2">
              <button type="button" onClick={toggleAll} className="flex items-center gap-1.5 text-[0.76rem] text-muted transition hover:text-primary">
                {allSelected
                  ? <CheckSquare2 size={14} strokeWidth={2.1} className="text-primary" />
                  : <Square size={14} strokeWidth={2.1} />}
                {allSelected ? "Desmarcar todas" : "Selecionar todas"}
              </button>
              {selected.size > 0 && (
                <>
                  <span className="text-[0.74rem] text-muted">·</span>
                  <span className="text-[0.76rem] font-semibold text-primary">
                    {selected.size} selecionada{selected.size > 1 ? "s" : ""} · {money(group.installments.filter((i) => selected.has(i.id)).reduce((s, i) => s + i.amount, 0))}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <select
                      className="field h-7 py-0 text-xs"
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                    >
                      <option value="PIX">Pix</option>
                      <option value="CASH">Dinheiro</option>
                      <option value="DEBIT_CARD">Débito</option>
                      <option value="CREDIT_CARD">Crédito</option>
                      <option value="BANK_SLIP">Boleto</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleBulkPay}
                      disabled={isPending}
                      className="button-primary h-7 px-3 text-xs"
                    >
                      {isPending ? "Processando..." : "Marcar como pagas"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* cada parcela */}
          {group.installments.map((i) => {
            const due = new Date(i.dueDate); due.setHours(0, 0, 0, 0);
            const overdue = due < today;
            const checked = selected.has(i.id);
            return (
              <div
                key={i.id}
                className={`flex flex-wrap items-center gap-3 px-4 py-3 transition ${checked ? "bg-primary-soft/30" : "bg-surface/20 hover:bg-surface-2/30"}`}
              >
                {/* checkbox */}
                <button type="button" onClick={() => toggle(i.id)} className="shrink-0 text-muted transition hover:text-primary">
                  {checked
                    ? <CheckSquare2 size={15} strokeWidth={2.1} className="text-primary" />
                    : <Square size={15} strokeWidth={2.1} />}
                </button>

                {/* info */}
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5">
                  <span className="chip text-xs">{i.sequence}/{i.totalCount}</span>
                  <span className="text-[0.78rem] text-muted">{i.orderCode}</span>
                  <span className={`text-[0.78rem] font-medium ${overdue ? "text-danger" : "text-muted"}`}>{date(i.dueDate)}{overdue && " · atrasada"}</span>
                </div>

                {/* valor */}
                <span className="font-display text-[0.95rem] font-semibold text-fg">{money(i.amount)}</span>

                {/* ação individual */}
                <form action={payInstallmentAction} className="flex items-center gap-1.5">
                  <input type="hidden" name="installmentId" value={i.id} />
                  <select className="field h-7 py-0 text-xs" name="paymentMethod" defaultValue="PIX">
                    <option value="PIX">Pix</option>
                    <option value="CASH">Dinheiro</option>
                    <option value="DEBIT_CARD">Débito</option>
                    <option value="CREDIT_CARD">Crédito</option>
                    <option value="BANK_SLIP">Boleto</option>
                  </select>
                  <button className="button-primary h-7 px-3 text-xs">Pagar</button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function InstallmentsTable({ installments }: { installments: Installment[] }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const groups = groupByCustomer(installments, today);

  if (installments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface-2/30 py-10 text-center text-[0.86rem] text-muted">
        Nenhuma parcela em aberto.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {groups.map((group) => (
        <CustomerCard key={group.customerName} group={group} today={today} />
      ))}
    </div>
  );
}
