"use client";

import { Clipboard, MessageCircle, RotateCcw, Send, WalletCards } from "lucide-react";
import { money } from "@/lib/format";
import {
  buildCollectionMessage,
  buildPostSaleMessage,
  buildRecoveryMessage,
  whatsappUrl
} from "@/lib/whatsapp";

export type CustomerWhatsAppOpportunity = {
  id: string;
  name: string;
  phone: string | null;
  debt: number;
  nextDueDate: string | null;
  lastOrderCode: string | null;
  lastOrderTotal: number | null;
  lastOrderAt: string | null;
  daysInactive: number | null;
};

function copyMessage(message: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) return;
  void navigator.clipboard.writeText(message);
}

function MessageAction({
  href,
  message,
  label
}: {
  href: string | null;
  message: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-success/25 bg-success-soft px-3 text-[0.78rem] font-semibold text-success transition hover:bg-success hover:text-primary-fg"
        >
          <MessageCircle size={14} />
          {label}
        </a>
      ) : (
        <button
          type="button"
          disabled
          className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-border bg-surface-2 px-3 text-[0.78rem] font-semibold text-subtle"
        >
          Sem WhatsApp
        </button>
      )}
      <button
        type="button"
        onClick={() => copyMessage(message)}
        className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-surface text-muted transition hover:text-fg"
        title="Copiar mensagem"
      >
        <Clipboard size={14} />
      </button>
    </div>
  );
}

export function CustomerWhatsAppCenter({
  customers
}: {
  customers: CustomerWhatsAppOpportunity[];
}) {
  const debtors = customers
    .filter((customer) => customer.debt > 0)
    .sort((a, b) => b.debt - a.debt)
    .slice(0, 4);

  const postSale = customers
    .filter((customer) => customer.lastOrderAt && customer.daysInactive !== null && customer.daysInactive <= 14)
    .sort((a, b) => new Date(b.lastOrderAt ?? 0).getTime() - new Date(a.lastOrderAt ?? 0).getTime())
    .slice(0, 4);

  const inactive = customers
    .filter((customer) => customer.daysInactive === null || customer.daysInactive >= 45)
    .sort((a, b) => (b.daysInactive ?? 9999) - (a.daysInactive ?? 9999))
    .slice(0, 4);

  const totalActions = debtors.length + postSale.length + inactive.length;
  if (totalActions === 0) return null;

  return (
    <section className="surface-card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.74rem] font-semibold uppercase tracking-wide text-muted">WhatsApp como centro</p>
          <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Mensagens prontas para vender e cobrar</h2>
          <p className="mt-1 text-[0.8rem] text-muted">Cobranca, pos-venda e recuperacao de cliente sem escrever do zero.</p>
        </div>
        <span className="chip self-start">{totalActions} oportunidades</span>
      </div>

      <div className="grid gap-4 p-5 xl:grid-cols-3">
        <div className="grid content-start gap-3">
          <div className="flex items-center gap-2">
            <WalletCards size={15} className="text-warning" />
            <p className="text-[0.76rem] font-semibold uppercase tracking-wide text-muted">Cobranca pronta</p>
          </div>
          {debtors.length ? debtors.map((customer) => {
            const message = buildCollectionMessage({
              customerName: customer.name,
              amount: customer.debt,
              dueDate: customer.nextDueDate,
              reference: customer.lastOrderCode ?? undefined
            });
            return (
              <div key={`debt-${customer.id}`} className="rounded-xl border border-border bg-surface-2/35 p-4">
                <p className="truncate font-semibold text-fg">{customer.name}</p>
                <p className="mt-1 text-[0.78rem] text-muted">Em aberto: {money(customer.debt)}</p>
                <div className="mt-3">
                  <MessageAction href={whatsappUrl(customer.phone, message)} message={message} label="Cobrar" />
                </div>
              </div>
            );
          }) : <p className="rounded-xl border border-dashed border-border p-4 text-[0.82rem] text-muted">Nenhum cliente devendo agora.</p>}
        </div>

        <div className="grid content-start gap-3">
          <div className="flex items-center gap-2">
            <Send size={15} className="text-success" />
            <p className="text-[0.76rem] font-semibold uppercase tracking-wide text-muted">Pos-venda</p>
          </div>
          {postSale.length ? postSale.map((customer) => {
            const message = buildPostSaleMessage({
              customerName: customer.name,
              orderCode: customer.lastOrderCode ?? undefined,
              total: customer.lastOrderTotal ?? undefined
            });
            return (
              <div key={`post-${customer.id}`} className="rounded-xl border border-border bg-surface-2/35 p-4">
                <p className="truncate font-semibold text-fg">{customer.name}</p>
                <p className="mt-1 text-[0.78rem] text-muted">{customer.lastOrderCode ?? "Ultima compra"} · {customer.lastOrderTotal !== null ? money(customer.lastOrderTotal) : "-"}</p>
                <div className="mt-3">
                  <MessageAction href={whatsappUrl(customer.phone, message)} message={message} label="Enviar" />
                </div>
              </div>
            );
          }) : <p className="rounded-xl border border-dashed border-border p-4 text-[0.82rem] text-muted">Sem compras recentes para pos-venda.</p>}
        </div>

        <div className="grid content-start gap-3">
          <div className="flex items-center gap-2">
            <RotateCcw size={15} className="text-primary" />
            <p className="text-[0.76rem] font-semibold uppercase tracking-wide text-muted">Recuperar parado</p>
          </div>
          {inactive.length ? inactive.map((customer) => {
            const message = buildRecoveryMessage({
              customerName: customer.name,
              daysInactive: customer.daysInactive
            });
            return (
              <div key={`inactive-${customer.id}`} className="rounded-xl border border-border bg-surface-2/35 p-4">
                <p className="truncate font-semibold text-fg">{customer.name}</p>
                <p className="mt-1 text-[0.78rem] text-muted">
                  {customer.daysInactive === null ? "Nunca comprou" : `${customer.daysInactive} dias sem comprar`}
                </p>
                <div className="mt-3">
                  <MessageAction href={whatsappUrl(customer.phone, message)} message={message} label="Recuperar" />
                </div>
              </div>
            );
          }) : <p className="rounded-xl border border-dashed border-border p-4 text-[0.82rem] text-muted">Nenhum cliente parado no momento.</p>}
        </div>
      </div>
    </section>
  );
}
