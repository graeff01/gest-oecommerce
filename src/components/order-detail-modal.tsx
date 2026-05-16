"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, X, Package, CreditCard, Calendar, FileText, User, Tag } from "lucide-react";
import { money, date } from "@/lib/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES, PAYMENT_METHOD_LABELS } from "@/lib/constants";

type OrderItem = {
  id: string;
  quantity: number;
  unitPrice: number | string;
  costPrice: number | string;
  label?: string | null;
  variant: {
    sku: string;
    color: string;
    size: string;
    product: { name: string };
  } | null;
};

type Installment = {
  id: string;
  sequence: number;
  totalCount: number;
  amount: number | string;
  dueDate: string | Date;
  paidAt: string | Date | null;
};

export type OrderDetail = {
  id: string;
  code: string;
  status: string;
  paymentMethod: string;
  channel: string;
  subtotal: number | string;
  discount: number | string;
  fee: number | string;
  total: number | string;
  notes: string | null;
  createdAt: string | Date;
  customer: { name: string; phone: string | null; email: string | null } | null;
  items: OrderItem[];
  installments: Installment[];
};

export function OrderDetailModal({ order }: { order: OrderDetail }) {
  const [open, setOpen] = useState(false);

  const subtotal = Number(order.subtotal);
  const discount = Number(order.discount);
  const fee = Number(order.fee);
  const total = Number(order.total);
  const paidInstallments = order.installments.filter((i) => i.paidAt).length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid h-7 w-7 place-items-center rounded-lg text-muted transition hover:bg-primary-soft hover:text-primary"
        title="Ver detalhes"
      >
        <Eye size={13} strokeWidth={2.1} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-end bg-fg/40 p-0 backdrop-blur-md sm:place-items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.22, 0.9, 0.32, 1] }}
              className="flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-border bg-elevated shadow-elev sm:max-h-[90dvh] sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* header */}
              <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-surface/60 px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                    <FileText size={17} strokeWidth={2.1} />
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-semibold tracking-tight text-fg">{order.code}</h2>
                    <p className="text-[0.76rem] text-muted">{date(order.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={ORDER_STATUS_TONES[order.status] ?? "status-pill"}>
                    {ORDER_STATUS_LABELS[order.status] ?? order.status}
                  </span>
                  <button
                    onClick={() => setOpen(false)}
                    className="grid h-9 w-9 place-items-center rounded-xl bg-surface-2 text-muted hover:bg-danger-soft hover:text-danger transition"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="grid gap-4 p-4 sm:gap-5 sm:p-6">

                  {/* cliente + canal */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-surface-2/40 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <User size={14} className="text-muted" strokeWidth={2.1} />
                        <span className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted">Cliente</span>
                      </div>
                      {order.customer ? (
                        <div>
                          <p className="font-semibold text-fg">{order.customer.name}</p>
                          {order.customer.phone && <p className="text-[0.8rem] text-muted">{order.customer.phone}</p>}
                          {order.customer.email && <p className="text-[0.8rem] text-muted">{order.customer.email}</p>}
                        </div>
                      ) : (
                        <p className="text-muted">Venda avulsa</p>
                      )}
                    </div>
                    <div className="rounded-xl border border-border bg-surface-2/40 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Tag size={14} className="text-muted" strokeWidth={2.1} />
                        <span className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted">Canal / Pagamento</span>
                      </div>
                      <p className="font-semibold text-fg">{order.channel}</p>
                      <p className="text-[0.8rem] text-muted">{PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}</p>
                    </div>
                  </div>

                  {/* itens */}
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Package size={14} className="text-muted" strokeWidth={2.1} />
                      <span className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted">Itens do pedido</span>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-border">
                      {order.items.map((item, idx) => (
                        <div
                          key={item.id}
                          className={`flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 ${idx > 0 ? "border-t border-border" : ""}`}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-fg">
                              {item.variant ? item.variant.product.name : (item.label ?? "Item avulso")}
                            </p>
                            {item.variant ? (
                              <p className="text-[0.76rem] text-muted">{item.variant.color} / {item.variant.size} · SKU: {item.variant.sku}</p>
                            ) : (
                              <p className="text-[0.76rem] text-warning">Item sem cadastro</p>
                            )}
                          </div>
                          <div className="shrink-0 text-left sm:text-right">
                            <p className="font-semibold text-fg">{money(Number(item.unitPrice) * item.quantity)}</p>
                            <p className="text-[0.76rem] text-muted">{item.quantity}× {money(item.unitPrice)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* totais */}
                  <div className="rounded-xl border border-border bg-surface-2/40 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <CreditCard size={14} className="text-muted" strokeWidth={2.1} />
                      <span className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted">Resumo financeiro</span>
                    </div>
                    <div className="grid gap-1.5">
                      <div className="flex justify-between text-[0.86rem]">
                        <span className="text-muted">Subtotal</span>
                        <span className="text-fg">{money(subtotal)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-[0.86rem]">
                          <span className="text-muted">Desconto</span>
                          <span className="text-success">− {money(discount)}</span>
                        </div>
                      )}
                      {fee > 0 && (
                        <div className="flex justify-between text-[0.86rem]">
                          <span className="text-muted">Taxa</span>
                          <span className="text-warning">+ {money(fee)}</span>
                        </div>
                      )}
                      <div className="mt-1 flex justify-between border-t border-border pt-2">
                        <span className="font-semibold text-fg">Total</span>
                        <span className="font-semibold text-fg">{money(total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* parcelas do crediário */}
                  {order.installments.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-muted" strokeWidth={2.1} />
                          <span className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted">
                            Parcelas — {paidInstallments}/{order.installments.length} pagas
                          </span>
                        </div>
                        <span className={paidInstallments === order.installments.length ? "status-pill" : "status-pill pill-warning"}>
                          {paidInstallments === order.installments.length ? "Quitado" : `${order.installments.length - paidInstallments} em aberto`}
                        </span>
                      </div>
                      <div className="overflow-hidden rounded-xl border border-border">
                        {order.installments.map((inst, idx) => {
                          const due = new Date(inst.dueDate);
                          due.setHours(0, 0, 0, 0);
                          const today = new Date(); today.setHours(0, 0, 0, 0);
                          const overdue = !inst.paidAt && due < today;
                          return (
                            <div key={inst.id} className={`flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 ${idx > 0 ? "border-t border-border" : ""} ${inst.paidAt ? "bg-success-soft/30" : overdue ? "bg-danger-soft/30" : ""}`}>
                              <div className="flex items-center gap-3">
                                <span className="w-8 text-[0.76rem] font-semibold text-muted">{inst.sequence}/{inst.totalCount}</span>
                                <span className={`text-[0.8rem] ${overdue ? "font-semibold text-danger" : "text-muted"}`}>
                                  {overdue ? "Vencida · " : ""}{date(inst.dueDate)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-fg">{money(inst.amount)}</span>
                                {inst.paidAt ? (
                                  <span className="status-pill text-[0.68rem]">Paga</span>
                                ) : overdue ? (
                                  <span className="status-pill pill-danger text-[0.68rem]">Vencida</span>
                                ) : (
                                  <span className="status-pill pill-warning text-[0.68rem]">Aberta</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* observações */}
                  {order.notes && (
                    <div className="rounded-xl border border-border bg-surface-2/40 p-4">
                      <p className="mb-1 text-[0.72rem] font-semibold uppercase tracking-wide text-muted">Observações</p>
                      <p className="text-[0.88rem] leading-relaxed text-fg">{order.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
