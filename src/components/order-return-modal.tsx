"use client";

import { useActionState, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, X } from "lucide-react";
import { returnOrderItemAction } from "@/app/(app)/actions/orders";
import { money } from "@/lib/format";

type ReturnItem = {
  id: string;
  quantity: number;
  unitPrice: number;
  label?: string | null;
  variant: {
    product: { name: string };
    color: string;
    size: string;
  } | null;
};

type Props = {
  orderId: string;
  orderCode: string;
  items: ReturnItem[];
};

type ActionState = { success?: true; error?: string } | null;

function itemLabel(item: ReturnItem): string {
  if (item.variant) {
    return `${item.variant.product.name} — ${item.variant.color} / ${item.variant.size}`;
  }
  return item.label ?? "Item avulso";
}

export function OrderReturnModal({ orderId, orderCode, items }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);

  const selectedItem = items.find((i) => i.id === selectedItemId);

  const [state, formAction, isPending] = useActionState(
    returnOrderItemAction,
    null as ActionState
  );

  function handleClose() {
    setOpen(false);
    setSelectedItemId(items[0]?.id ?? "");
    setQuantity(1);
  }

  function handleItemChange(id: string) {
    setSelectedItemId(id);
    setQuantity(1);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid h-7 w-7 place-items-center rounded-lg text-muted transition hover:bg-warning-soft hover:text-warning"
        title="Registrar devolução / troca"
      >
        <RotateCcw size={13} strokeWidth={2.1} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-fg/40 p-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.22, 0.9, 0.32, 1] }}
              className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-border bg-elevated shadow-elev"
              onClick={(e) => e.stopPropagation()}
            >
              {/* header */}
              <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-surface/60 px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-warning-soft text-warning">
                    <RotateCcw size={17} strokeWidth={2.1} />
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-semibold tracking-tight text-fg">
                      Devolução / Troca
                    </h2>
                    <p className="text-[0.76rem] text-muted">{orderCode}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="grid h-9 w-9 place-items-center rounded-xl bg-surface-2 text-muted hover:bg-danger-soft hover:text-danger transition"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {state?.success ? (
                  <div className="rounded-xl border border-success/25 bg-success-soft p-4 text-center text-[0.9rem] font-medium text-success">
                    Devolução registrada com sucesso!
                    <br />
                    <button
                      type="button"
                      onClick={handleClose}
                      className="mt-3 text-[0.8rem] text-muted underline hover:text-fg"
                    >
                      Fechar
                    </button>
                  </div>
                ) : (
                  <form action={formAction} className="grid gap-4">
                    <input type="hidden" name="orderId" value={orderId} />

                    {state?.error && (
                      <div className="rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-[0.84rem] text-danger">
                        {state.error}
                      </div>
                    )}

                    <label className="label">
                      Item a devolver
                      <select
                        name="itemId"
                        className="field"
                        value={selectedItemId}
                        onChange={(e) => handleItemChange(e.target.value)}
                      >
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {itemLabel(item)} ({item.quantity}×{" "}
                            {money(item.unitPrice)})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="label">
                      Quantidade a devolver
                      <input
                        type="number"
                        name="quantity"
                        className="field"
                        min={1}
                        max={selectedItem?.quantity ?? 1}
                        value={quantity}
                        onChange={(e) =>
                          setQuantity(
                            Math.max(
                              1,
                              Math.min(
                                selectedItem?.quantity ?? 1,
                                parseInt(e.target.value, 10) || 1
                              )
                            )
                          )
                        }
                        required
                      />
                      {selectedItem && (
                        <span className="mt-1 text-[0.76rem] text-muted">
                          Máx: {selectedItem.quantity} ·{" "}
                          Reembolso estimado:{" "}
                          <strong className="text-fg">
                            {money(selectedItem.unitPrice * quantity)}
                          </strong>
                        </span>
                      )}
                    </label>

                    <label className="label">
                      Motivo da devolução
                      <textarea
                        name="reason"
                        className="field min-h-[72px]"
                        placeholder="Ex: produto com defeito, tamanho errado..."
                        required
                      />
                    </label>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isPending}
                        className="button-primary flex-1"
                      >
                        {isPending ? "Processando..." : "Registrar devolução"}
                      </button>
                      <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-xl border border-border px-4 py-2 text-sm text-muted hover:text-fg transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
