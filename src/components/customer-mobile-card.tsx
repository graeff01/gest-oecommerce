"use client";

import { useState } from "react";
import { ChevronDown, Copy, MessageCircle, Pencil, Phone, ReceiptText } from "lucide-react";
import { deleteCustomerAction, updateCustomerAction } from "@/app/(app)/actions/customers";
import { DeleteButton } from "@/components/delete-button";
import type { CustomerRowData } from "@/components/customer-orders-row";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from "@/lib/constants";
import { buildCollectionMessage, buildPostSaleMessage, buildRecoveryMessage, whatsappUrl } from "@/lib/whatsapp";

function money(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function dt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

function copyMessage(message: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) return;
  void navigator.clipboard.writeText(message);
}

function whatsappActions(c: CustomerRowData) {
  const collectionMessage = c.debt > 0
    ? buildCollectionMessage({ customerName: c.name, amount: c.debt, dueDate: c.nextDueDate, reference: c.lastOrderCode ?? undefined })
    : null;
  const postSaleMessage = c.lastOrderCode
    ? buildPostSaleMessage({ customerName: c.name, orderCode: c.lastOrderCode, total: c.lastOrderTotal ?? undefined, items: c.lastOrderItems })
    : null;
  const recoveryMessage = c.daysInactive === null || c.daysInactive >= 45
    ? buildRecoveryMessage({ customerName: c.name, daysInactive: c.daysInactive, lastPurchase: c.lastOrderItems })
    : null;

  return [
    collectionMessage ? { key: "collection", label: "Cobrar", message: collectionMessage } : null,
    postSaleMessage ? { key: "post-sale", label: "Pos-venda", message: postSaleMessage } : null,
    recoveryMessage ? { key: "recovery", label: "Recuperar", message: recoveryMessage } : null
  ].filter(Boolean) as { key: string; label: string; message: string }[];
}

export function CustomerMobileCard({ c }: { c: CustomerRowData }) {
  const [open, setOpen] = useState(false);
  const actions = whatsappActions(c);

  return (
    <article className="surface-card overflow-hidden p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-semibold text-fg">{c.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 truncate text-[0.78rem] text-muted">
            <Phone size={12} />
            {c.phone || c.email || "Sem contato"}
          </p>
        </div>
        {c.debt > 0 ? (
          <span className="status-pill pill-danger shrink-0">{money(c.debt)}</span>
        ) : (
          <span className="chip shrink-0">em dia</span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-surface-2/35 p-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-muted">Compras</p>
          <p className="mt-1 font-display text-lg font-semibold text-fg">{c.ordersCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-2/35 p-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-muted">Total gasto</p>
          <p className="mt-1 font-display text-lg font-semibold text-fg">{money(c.totalSpent)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {actions.length ? (
          <div className="grid grid-cols-3 gap-2">
            {actions.map((action) => {
              const href = whatsappUrl(c.phone, action.message);
              return (
                <div key={action.key} className="grid gap-1">
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-success/25 bg-success-soft px-2 text-[0.72rem] font-semibold text-success"
                    >
                      <MessageCircle size={13} />
                      {action.label}
                    </a>
                  ) : (
                    <button type="button" disabled className="min-h-10 rounded-xl border border-border bg-surface-2 px-2 text-[0.72rem] font-semibold text-subtle">
                      {action.label}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => copyMessage(action.message)}
                    className="inline-flex min-h-8 items-center justify-center gap-1 rounded-lg text-[0.68rem] font-semibold text-muted"
                  >
                    <Copy size={11} />
                    copiar
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="button-secondary col-span-1 min-h-10 px-2 text-xs"
          >
            <ReceiptText size={14} />
            Pedidos
          </button>
          <button
            type="button"
            className="button-secondary col-span-1 min-h-10 px-2 text-xs"
            popoverTarget={`mobile-edit-customer-${c.id}`}
          >
            <Pencil size={14} />
            Editar
          </button>
          <form action={deleteCustomerAction} className="col-span-1">
            <input type="hidden" name="id" value={c.id} />
            <DeleteButton confirmMessage={`Excluir o cliente "${c.name}"? Esta acao nao pode ser desfeita.`} />
          </form>
        </div>
      </div>

      {open ? (
        <div className="mt-4 grid gap-2 border-t border-border pt-4">
          {c.orders.length ? c.orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-border bg-surface-2/35 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[0.82rem] font-semibold text-fg">{order.code}</p>
                  <p className="mt-0.5 truncate text-[0.72rem] text-muted">{order.itemsLabel || order.channel} · {dt(order.createdAt)}</p>
                </div>
                <span className={`shrink-0 text-[0.68rem] ${ORDER_STATUS_TONES[order.status] ?? "status-pill"}`}>
                  {ORDER_STATUS_LABELS[order.status] ?? order.status}
                </span>
              </div>
              <p className="mt-2 text-right font-semibold text-fg">{money(order.total)}</p>
            </div>
          )) : (
            <p className="rounded-xl border border-dashed border-border p-4 text-center text-[0.78rem] text-muted">Nenhum pedido registrado.</p>
          )}
        </div>
      ) : null}

      <div
        id={`mobile-edit-customer-${c.id}`}
        popover="auto"
        className="w-full max-w-sm overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-xl backdrop:bg-fg/20"
        style={{ maxHeight: "min(90dvh, 560px)" }}
      >
        <form action={updateCustomerAction} className="grid gap-3">
          <input type="hidden" name="id" value={c.id} />
          <p className="font-display text-base font-semibold text-fg">Editar cliente</p>
          <label className="label">Nome<input className="field" name="name" defaultValue={c.name} required /></label>
          <label className="label">E-mail<input className="field" name="email" type="email" defaultValue={c.email ?? ""} /></label>
          <label className="label">WhatsApp<input className="field" name="phone" defaultValue={c.phone ?? ""} /></label>
          <label className="label">CPF/CNPJ<input className="field" name="document" defaultValue={c.document ?? ""} /></label>
          <label className="label">Endereco<input className="field" name="address" defaultValue={c.address ?? ""} /></label>
          <label className="label">Observacoes<textarea className="field min-h-16" name="notes" defaultValue={c.notes ?? ""} /></label>
          <div className="flex gap-2">
            <button type="submit" className="button-primary flex-1">Salvar</button>
            <button type="button" popoverTargetAction="hide" popoverTarget={`mobile-edit-customer-${c.id}`} className="rounded-xl border border-border px-4 py-2 text-sm text-muted hover:text-fg">Cancelar</button>
          </div>
        </form>
      </div>
    </article>
  );
}
