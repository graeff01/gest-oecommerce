"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, MessageCircle, Pencil } from "lucide-react";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from "@/lib/constants";
import { DeleteButton } from "@/components/delete-button";
import { deleteCustomerAction, updateCustomerAction } from "@/app/(app)/actions/customers";
import { buildCollectionMessage, buildPostSaleMessage, buildRecoveryMessage, whatsappUrl } from "@/lib/whatsapp";

type Order = {
  id: string;
  code: string;
  status: string;
  total: number;
  createdAt: string;
  channel: string;
  paymentMethod: string;
  itemsLabel?: string | null;
};

export type CustomerRowData = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  document: string | null;
  address: string | null;
  notes: string | null;
  totalSpent: number;
  debt: number;
  nextDueDate: string | null;
  daysInactive: number | null;
  lastOrderCode: string | null;
  lastOrderTotal: number | null;
  lastOrderItems: string | null;
  ordersCount: number;
  orders: Order[];
};

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

export function CustomerOrdersRow({ c }: { c: CustomerRowData }) {
  const [open, setOpen] = useState(false);
  const collectionMessage = c.debt > 0
    ? buildCollectionMessage({
      customerName: c.name,
      amount: c.debt,
      dueDate: c.nextDueDate,
      reference: c.lastOrderCode ?? undefined
    })
    : null;
  const postSaleMessage = c.lastOrderCode
    ? buildPostSaleMessage({
      customerName: c.name,
      orderCode: c.lastOrderCode,
      total: c.lastOrderTotal ?? undefined,
      items: c.lastOrderItems
    })
    : null;
  const recoveryMessage = c.daysInactive === null || c.daysInactive >= 45
    ? buildRecoveryMessage({
      customerName: c.name,
      daysInactive: c.daysInactive,
      lastPurchase: c.lastOrderItems
    })
    : null;
  const whatsappActions = [
    collectionMessage ? { key: "collection", label: "Cobrar valor em aberto", message: collectionMessage } : null,
    postSaleMessage ? { key: "post-sale", label: "Fazer pos-venda", message: postSaleMessage } : null,
    recoveryMessage ? { key: "recovery", label: "Recuperar cliente parado", message: recoveryMessage } : null
  ].filter(Boolean) as { key: string; label: string; message: string }[];

  return (
    <>
      <tr className="cursor-pointer select-none" onClick={() => setOpen((o) => !o)}>
        <td className="max-w-[12rem] truncate font-semibold text-fg">{c.name}</td>
        <td className="max-w-[11rem] truncate text-muted">{c.phone || c.email || "-"}</td>
        <td><span className="chip">{c.ordersCount} ped.</span></td>
        <td className="text-right font-semibold text-fg">{money(c.totalSpent)}</td>
        <td className="text-right font-semibold">
          {c.debt > 0
            ? <span className="text-danger">{money(c.debt)}</span>
            : <span className="text-muted">-</span>}
        </td>
        <td>
          <div className="flex items-center justify-end gap-1.5">
            {whatsappActions.length ? (
              <>
                <button
                  type="button"
                  className="grid h-7 w-7 place-items-center rounded-lg text-muted transition hover:bg-success-soft hover:text-success"
                  popoverTarget={`whatsapp-customer-${c.id}`}
                  onClick={(e) => e.stopPropagation()}
                  title="Mensagens de WhatsApp"
                >
                  <MessageCircle size={13} strokeWidth={2.1} />
                </button>
                <div
                  id={`whatsapp-customer-${c.id}`}
                  popover="auto"
                  className="w-[min(92vw,360px)] rounded-2xl border border-border bg-surface p-4 shadow-xl backdrop:bg-fg/20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-3">
                    <p className="font-display text-sm font-semibold text-fg">WhatsApp para {c.name}</p>
                    <p className="mt-1 text-[0.74rem] text-muted">Escolha a abordagem e revise antes de enviar.</p>
                  </div>
                  <div className="grid gap-2">
                    {whatsappActions.map((action) => {
                      const href = whatsappUrl(c.phone, action.message);
                      return (
                        <div key={action.key} className="rounded-xl border border-border bg-surface-2/35 p-3">
                          <p className="text-[0.78rem] font-semibold text-fg">{action.label}</p>
                          <p className="mt-1 line-clamp-3 text-[0.74rem] text-muted">{action.message}</p>
                          <div className="mt-3 flex gap-2">
                            {href ? (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-8 flex-1 items-center justify-center gap-2 rounded-xl border border-success/25 bg-success-soft px-3 text-[0.76rem] font-semibold text-success transition hover:bg-success hover:text-primary-fg"
                              >
                                <MessageCircle size={13} />
                                Enviar
                              </a>
                            ) : (
                              <button type="button" disabled className="h-8 flex-1 rounded-xl border border-border bg-surface-2 px-3 text-[0.76rem] font-semibold text-subtle">
                                Sem WhatsApp
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => copyMessage(action.message)}
                              className="grid h-8 w-8 place-items-center rounded-xl border border-border text-muted transition hover:text-fg"
                              title="Copiar mensagem"
                            >
                              <Copy size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : null}
            <button
              type="button"
              className="grid h-7 w-7 place-items-center rounded-lg text-muted transition hover:bg-warning-soft hover:text-warning"
              popoverTarget={`edit-customer-${c.id}`}
              onClick={(e) => e.stopPropagation()}
              title="Editar cliente"
            >
              <Pencil size={12} strokeWidth={2.2} />
            </button>
            <form action={deleteCustomerAction} onClick={(e) => e.stopPropagation()}>
              <input type="hidden" name="id" value={c.id} />
              <DeleteButton confirmMessage={`Excluir o cliente "${c.name}"? Esta ação não pode ser desfeita.`} />
            </form>
            <button
              type="button"
              className="grid h-6 w-6 place-items-center rounded-md text-muted transition hover:text-fg"
              onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
              aria-label={open ? "Recolher" : "Ver pedidos"}
            >
              {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
          </div>

          {/* edit popover */}
          <div
            id={`edit-customer-${c.id}`}
            popover="auto"
            className="w-full max-w-sm overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-xl backdrop:bg-fg/20"
            style={{ maxHeight: "min(90dvh, 560px)" }}
          >
            <form action={updateCustomerAction} className="grid gap-3">
              <input type="hidden" name="id" value={c.id} />
              <p className="font-display text-base font-semibold text-fg">Editar cliente</p>
              <label className="label">Nome<input className="field" name="name" defaultValue={c.name} required /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="label">E-mail<input className="field" name="email" type="email" defaultValue={c.email ?? ""} /></label>
                <label className="label">WhatsApp<input className="field" name="phone" defaultValue={c.phone ?? ""} /></label>
              </div>
              <label className="label">CPF/CNPJ<input className="field" name="document" defaultValue={c.document ?? ""} /></label>
              <label className="label">Endereço<input className="field" name="address" defaultValue={c.address ?? ""} /></label>
              <label className="label">Observações<textarea className="field min-h-16" name="notes" defaultValue={c.notes ?? ""} /></label>
              <div className="flex gap-2">
                <button type="submit" className="button-primary flex-1">Salvar</button>
                <button type="button" popoverTargetAction="hide" popoverTarget={`edit-customer-${c.id}`} className="rounded-xl border border-border px-4 py-2 text-sm text-muted hover:text-fg">Cancelar</button>
              </div>
            </form>
          </div>
        </td>
      </tr>

      {/* order history rows */}
      {open && (
        c.orders.length === 0 ? (
          <tr className="bg-surface-2/30">
            <td colSpan={6} className="px-8 py-3 text-[0.78rem] italic text-muted">Nenhum pedido registrado para este cliente.</td>
          </tr>
        ) : (
          c.orders.map((order) => (
            <tr key={order.id} className="bg-surface-2/30">
              <td className="pl-8 text-[0.76rem] font-semibold text-fg" colSpan={2}>↳ {order.code}</td>
              <td className="text-[0.76rem] text-muted">{order.channel}</td>
              <td>
                <span className={`text-[0.72rem] ${ORDER_STATUS_TONES[order.status] ?? "status-pill"}`}>
                  {ORDER_STATUS_LABELS[order.status] ?? order.status}
                </span>
              </td>
              <td className="text-right text-[0.76rem] font-semibold text-fg">{money(order.total)}</td>
              <td className="text-[0.76rem] text-muted">{dt(order.createdAt)}</td>
            </tr>
          ))
        )
      )}
    </>
  );
}
