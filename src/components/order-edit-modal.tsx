"use client";

import { useActionState, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, X, CheckCircle2 } from "lucide-react";
import { updateOrderAction } from "@/app/(app)/actions/orders";

type Props = {
  order: {
    id: string;
    channel: string;
    discount: number;
    fee: number;
    notes: string | null;
    status: string;
    paymentMethod: string;
    total: number;
    subtotal: number;
  };
};

export function OrderEditModal({ order }: Props) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateOrderAction, null);

  // fecha automaticamente após sucesso
  if (state?.success && open) setOpen(false);

  const canEdit = order.status !== "CANCELED";

  if (!canEdit) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid h-7 w-7 place-items-center rounded-lg text-muted transition hover:bg-warning-soft hover:text-warning"
        title="Editar venda"
      >
        <Pencil size={12} strokeWidth={2.2} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-fg/40 p-4 backdrop-blur-md"
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
              className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-elevated shadow-elev"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-4 border-b border-border bg-surface/60 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-warning-soft text-warning">
                    <Pencil size={16} strokeWidth={2.1} />
                  </span>
                  <div>
                    <h2 className="font-display text-base font-semibold tracking-tight text-fg">Editar venda</h2>
                    <p className="text-[0.74rem] text-muted">Canal, desconto, taxa e observações</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-xl bg-surface-2 text-muted hover:text-fg transition">
                  <X size={15} />
                </button>
              </div>

              <form action={action} className="grid gap-4 p-5">
                <input type="hidden" name="id" value={order.id} />

                <label className="label">
                  Canal
                  <input className="field" name="channel" defaultValue={order.channel} required />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="label">
                    Desconto (R$)
                    <input className="field" name="discount" type="number" min="0" step="0.01" defaultValue={order.discount} />
                  </label>
                  <label className="label">
                    Taxa (R$)
                    <input className="field" name="fee" type="number" min="0" step="0.01" defaultValue={order.fee} />
                  </label>
                </div>

                <label className="label">
                  Observações
                  <textarea className="field min-h-20" name="notes" defaultValue={order.notes ?? ""} />
                </label>

                {state?.error && (
                  <p className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-[0.86rem] font-medium text-danger">
                    {state.error}
                  </p>
                )}

                {state?.success && (
                  <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success-soft px-4 py-3 text-[0.86rem] font-medium text-success">
                    <CheckCircle2 size={15} />
                    Venda atualizada com sucesso!
                  </div>
                )}

                <div className="flex gap-2">
                  <button className="button-primary flex-1" disabled={pending}>
                    {pending ? "Salvando..." : "Salvar alterações"}
                  </button>
                  <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-border px-4 py-2 text-sm text-muted hover:text-fg transition">
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
