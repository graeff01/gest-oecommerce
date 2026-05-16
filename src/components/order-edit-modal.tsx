"use client";

import { useActionState, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, X, CheckCircle2, AlertTriangle, Plus, Trash2 } from "lucide-react";
import { updateOrderAction, updateInstallmentsAction } from "@/app/(app)/actions/orders";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";

type Customer = { id: string; name: string };

type Installment = {
  id: string;
  sequence: number;
  totalCount: number;
  dueDate: string; // ISO string
  amount: number;
  paidAt: string | null;
};

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
    createdAt: string; // ISO string
  };
  customers?: Customer[];
  customerId?: string | null;
  installments?: Installment[];
};

const STATUS_OPTIONS = [
  { value: "NEW",       label: "Novo" },
  { value: "PAID",      label: "Pago" },
  { value: "PICKING",   label: "Separando" },
  { value: "SHIPPED",   label: "Enviado" },
  { value: "DELIVERED", label: "Entregue" },
];

function toDatetimeLocal(iso: string) {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function toDateInput(iso: string) {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  } catch {
    return "";
  }
}

type EditableInstallment = { dueDate: string; amount: string };

function InstallmentsEditor({
  paidInstallments,
  initialUnpaid,
  orderId,
  onSuccess
}: {
  paidInstallments: Installment[];
  initialUnpaid: Installment[];
  orderId: string;
  onSuccess: () => void;
}) {
  const [rows, setRows] = useState<EditableInstallment[]>(
    initialUnpaid.length > 0
      ? initialUnpaid.map((i) => ({ dueDate: toDateInput(i.dueDate), amount: String(i.amount) }))
      : [{ dueDate: "", amount: "" }]
  );
  const [state, action, pending] = useActionState(updateInstallmentsAction, null);

  if (state?.success) {
    onSuccess();
    return null;
  }

  function addRow() {
    setRows((r) => [...r, { dueDate: "", amount: "" }]);
  }

  function removeRow(index: number) {
    setRows((r) => r.filter((_, i) => i !== index));
  }

  function updateRow(index: number, field: keyof EditableInstallment, value: string) {
    setRows((r) => r.map((row, i) => i === index ? { ...row, [field]: value } : row));
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[0.78rem] font-semibold uppercase tracking-wide text-muted">Parcelas</span>
        <span className="text-[0.74rem] text-muted">{paidInstallments.length} paga(s)</span>
      </div>

      {/* paid — read-only */}
      {paidInstallments.map((inst) => (
        <div key={inst.id} className="flex items-center gap-2 rounded-xl border border-border bg-surface-2/40 px-3 py-2 opacity-60">
          <span className="min-w-[1.6rem] text-center text-[0.75rem] font-bold text-muted">{inst.sequence}</span>
          <span className="flex-1 text-[0.82rem] text-fg">
            {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(inst.dueDate))}
          </span>
          <span className="text-[0.82rem] font-semibold text-success">
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(inst.amount)}
          </span>
          <span className="rounded-full bg-success/10 px-2 py-0.5 text-[0.7rem] font-semibold text-success">Paga</span>
        </div>
      ))}

      {/* unpaid — editable */}
      <form action={action} className="grid gap-2">
        <input type="hidden" name="orderId" value={orderId} />
        <input type="hidden" name="installments" value={JSON.stringify(rows.map((r) => ({ dueDate: r.dueDate, amount: r.amount })))} />

        {rows.map((row, i) => (
          <div key={i} className="grid gap-2 sm:flex sm:items-center">
            <span className="min-w-[1.6rem] text-center text-[0.75rem] font-bold text-muted">
              {paidInstallments.length + i + 1}
            </span>
            <input
              type="date"
              className="field h-8 flex-1 text-xs"
              value={row.dueDate}
              onChange={(e) => updateRow(i, "dueDate", e.target.value)}
              required
            />
            <input
              type="number"
              className="field h-8 w-full text-xs sm:w-24"
              min="0.01"
              step="0.01"
              placeholder="0,00"
              value={row.amount}
              onChange={(e) => updateRow(i, "amount", e.target.value)}
              required
            />
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="grid h-7 w-7 place-items-center rounded-lg text-muted transition hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-1.5 text-[0.78rem] text-muted transition hover:border-primary hover:text-primary"
        >
          <Plus size={12} /> Adicionar parcela
        </button>

        {state?.error && (
          <div className="flex items-center gap-2 rounded-xl border border-danger/20 bg-danger-soft px-3 py-2 text-[0.82rem] font-medium text-danger">
            <AlertTriangle size={13} className="shrink-0" />
            {state.error}
          </div>
        )}

        <button className="button-primary h-8 text-sm" disabled={pending}>
          {pending ? "Salvando parcelas..." : "Salvar parcelas"}
        </button>
      </form>
    </div>
  );
}

export function OrderEditModal({ order, customers = [], customerId, installments = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateOrderAction, null);

  if (state?.success && open) setOpen(false);

  const canEdit = order.status !== "CANCELED";
  if (!canEdit) return null;

  const isCrediario = order.paymentMethod === "CREDIARIO";
  const paidInstallments = installments.filter((i) => i.paidAt !== null);
  const unpaidInstallments = installments.filter((i) => i.paidAt === null);

  const paymentMethods = Object.entries(PAYMENT_METHOD_LABELS);

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
              className="flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-elevated shadow-elev sm:max-h-[90dvh] sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* header */}
              <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-surface/60 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-warning-soft text-warning">
                    <Pencil size={16} strokeWidth={2.1} />
                  </span>
                  <div>
                    <h2 className="font-display text-base font-semibold tracking-tight text-fg">Editar venda</h2>
                    <p className="text-[0.74rem] text-muted">Todos os campos são editáveis</p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-xl bg-surface-2 text-muted transition hover:text-fg"
                >
                  <X size={15} />
                </button>
              </div>

              {/* body */}
              <div className="flex-1 overflow-y-auto">
                <form action={action} className="grid gap-4 p-5">
                  <input type="hidden" name="id" value={order.id} />

                  {/* data + canal */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="label">
                      Data do pedido
                      <input
                        className="field"
                        name="createdAt"
                        type="datetime-local"
                        defaultValue={toDatetimeLocal(order.createdAt)}
                      />
                    </label>
                    <label className="label">
                      Canal
                      <input className="field" name="channel" defaultValue={order.channel} required />
                    </label>
                  </div>

                  {/* status + pagamento */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="label">
                      Status
                      <select className="field" name="status" defaultValue={order.status}>
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="label">
                      Forma de pagamento
                      <select className="field" name="paymentMethod" defaultValue={order.paymentMethod}>
                        {paymentMethods.map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {/* cliente */}
                  {customers.length > 0 && (
                    <label className="label">
                      Cliente
                      <select className="field" name="customerId" defaultValue={customerId ?? ""}>
                        <option value="">Venda avulsa (sem cliente)</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </label>
                  )}

                  {/* desconto + taxa */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="label">
                      Desconto (R$)
                      <input
                        className="field"
                        name="discount"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={order.discount > 0 ? order.discount : ""}
                        placeholder="0,00"
                      />
                    </label>
                    <label className="label">
                      Taxa (R$)
                      <input
                        className="field"
                        name="fee"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={order.fee > 0 ? order.fee : ""}
                        placeholder="0,00"
                      />
                    </label>
                  </div>

                  {/* resumo do total */}
                  <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2/40 px-4 py-3 text-[0.83rem]">
                    <span className="text-muted">Subtotal original</span>
                    <span className="font-semibold text-fg">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(order.subtotal)}
                    </span>
                  </div>

                  {/* observações */}
                  <label className="label">
                    Observações
                    <textarea className="field min-h-20" name="notes" defaultValue={order.notes ?? ""} />
                  </label>

                  {state?.error && (
                    <div className="flex items-center gap-2 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-[0.84rem] font-medium text-danger">
                      <AlertTriangle size={14} className="shrink-0" />
                      {state.error}
                    </div>
                  )}

                  {state?.success && (
                    <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success-soft px-4 py-3 text-[0.86rem] font-medium text-success">
                      <CheckCircle2 size={15} />
                      Venda atualizada com sucesso!
                    </div>
                  )}

                  <div className="grid gap-2 sm:flex">
                    <button className="button-primary flex-1" disabled={pending}>
                      {pending ? "Salvando..." : "Salvar alterações"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-xl border border-border px-4 py-2 text-sm text-muted transition hover:text-fg"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>

                {/* installments section — only for crediário */}
                {isCrediario && (
                  <div className="border-t border-border px-5 pb-5 pt-4">
                    <InstallmentsEditor
                      paidInstallments={paidInstallments}
                      initialUnpaid={unpaidInstallments}
                      orderId={order.id}
                      onSuccess={() => setOpen(false)}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
