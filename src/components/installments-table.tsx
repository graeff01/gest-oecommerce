"use client";

import { useState, useTransition } from "react";
import { CheckSquare2, MessageCircle, Square } from "lucide-react";
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

export function InstallmentsTable({ installments }: { installments: Installment[]; }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMethod, setBulkMethod] = useState("PIX");
  const [isPending, startTransition] = useTransition();

  const today = new Date(); today.setHours(0, 0, 0, 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === installments.length
        ? new Set()
        : new Set(installments.map((i) => i.id))
    );
  }

  function handleBulkPay() {
    if (selected.size === 0) return;
    const fd = new FormData();
    fd.set("installmentIds", JSON.stringify(Array.from(selected)));
    fd.set("paymentMethod", bulkMethod);
    startTransition(() => {
      payManyInstallmentsAction(fd).then(() => setSelected(new Set()));
    });
  }

  const allSelected = installments.length > 0 && selected.size === installments.length;

  if (installments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface-2/30 py-10 text-center text-[0.86rem] text-muted">
        Nenhuma parcela em aberto.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {/* barra de ações em lote */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/25 bg-primary-soft px-4 py-3">
          <span className="text-[0.84rem] font-semibold text-fg">
            {selected.size} {selected.size === 1 ? "parcela selecionada" : "parcelas selecionadas"}
            {" · "}
            <span className="text-primary">
              {money(installments.filter((i) => selected.has(i.id)).reduce((s, i) => s + i.amount, 0))}
            </span>
          </span>
          <div className="flex flex-1 items-center justify-end gap-2">
            <select
              className="field h-8 py-1 text-xs"
              value={bulkMethod}
              onChange={(e) => setBulkMethod(e.target.value)}
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
              className="button-primary h-8 px-4 text-xs"
            >
              {isPending ? "Processando..." : `Marcar ${selected.size} como pagas`}
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="h-8 rounded-xl border border-border px-3 text-xs text-muted hover:text-fg transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="table-shell overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-10">
                <button type="button" onClick={toggleAll} className="text-muted hover:text-primary transition">
                  {allSelected ? <CheckSquare2 size={15} strokeWidth={2.1} /> : <Square size={15} strokeWidth={2.1} />}
                </button>
              </th>
              <th>Cliente</th>
              <th>Pedido</th>
              <th>Parcela</th>
              <th>Vencimento</th>
              <th className="text-right">Valor</th>
              <th className="text-right">Ação individual</th>
            </tr>
          </thead>
          <tbody>
            {installments.map((i) => {
              const due = new Date(i.dueDate); due.setHours(0, 0, 0, 0);
              const overdue = due < today;
              const checked = selected.has(i.id);
              return (
                <tr key={i.id} className={checked ? "bg-primary-soft/40" : ""}>
                  <td>
                    <button type="button" onClick={() => toggle(i.id)} className="text-muted hover:text-primary transition">
                      {checked ? <CheckSquare2 size={15} strokeWidth={2.1} className="text-primary" /> : <Square size={15} strokeWidth={2.1} />}
                    </button>
                  </td>
                  <td className="max-w-[14rem] truncate font-semibold text-fg">{i.customerName}</td>
                  <td className="text-muted">{i.orderCode}</td>
                  <td><span className="chip">{i.sequence}/{i.totalCount}</span></td>
                  <td><span className={overdue ? "status-pill pill-danger" : "text-muted"}>{date(i.dueDate)}</span></td>
                  <td className="whitespace-nowrap text-right font-semibold text-fg">{money(i.amount)}</td>
                  <td className="whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      {buildWhatsAppUrl(i.customerPhone, i) ? (
                        <a
                          href={buildWhatsAppUrl(i.customerPhone, i)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="grid h-7 w-7 place-items-center rounded-lg text-muted transition hover:bg-success-soft hover:text-success"
                          title="Enviar lembrete via WhatsApp"
                        >
                          <MessageCircle size={13} strokeWidth={2.1} />
                        </a>
                      ) : null}
                      <form action={payInstallmentAction} className="flex items-center gap-2">
                        <input type="hidden" name="installmentId" value={i.id} />
                        <select className="field h-7 py-0 text-xs" name="paymentMethod" defaultValue="PIX">
                          <option value="PIX">Pix</option>
                          <option value="CASH">Dinheiro</option>
                          <option value="DEBIT_CARD">Débito</option>
                          <option value="CREDIT_CARD">Crédito</option>
                          <option value="BANK_SLIP">Boleto</option>
                        </select>
                        <button className="button-primary h-7 px-2.5 py-0 text-xs">Pagar</button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
