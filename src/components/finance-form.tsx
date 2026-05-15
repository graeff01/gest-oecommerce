"use client";

import { CircleDollarSign } from "lucide-react";
import { useActionState } from "react";
import { createFinancialTransactionAction } from "@/app/(app)/actions/finance";
import { PAYMENT_METHODS } from "@/lib/constants";
import { FinanceCategorySelect } from "./finance-category-select";

type Props = {
  categories: string[];
};

export function FinanceForm({ categories }: Props) {
  const [state, action, pending] = useActionState(createFinancialTransactionAction, null);

  return (
    <form action={action} className="surface-card grid gap-4 p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-2 text-primary-fg shadow-glow">
          <CircleDollarSign size={17} strokeWidth={2.1} />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Novo lançamento</h2>
          <p className="text-[0.76rem] font-normal text-muted">Receita ou despesa, com vínculo de pagamento.</p>
        </div>
      </div>

      {state?.error && (
        <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm text-danger">
          {state.error}
        </p>
      )}

      <label className="label">
        Tipo
        <select className="field" name="type">
          <option value="REVENUE">Receita</option>
          <option value="EXPENSE">Gasto</option>
        </select>
      </label>
      <label className="label">
        Título<input className="field" name="title" required />
      </label>
      <label className="label">
        Categoria
        <FinanceCategorySelect categories={categories} name="category" required />
      </label>
      <label className="label">
        Valor<input className="field" name="amount" type="number" min="0" max="9999999.99" step="0.01" required />
      </label>
      <label className="label">
        Pagamento
        <select className="field" name="paymentMethod">
          <option value="">Não definido</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="label">
          Vencimento<input className="field" name="dueDate" type="date" />
        </label>
        <label className="label">
          Pago em<input className="field" name="paidAt" type="date" />
        </label>
      </div>
      <label className="label">
        Observações<textarea className="field min-h-20" name="notes" />
      </label>
      <button className="button-primary" disabled={pending}>
        {pending ? "Salvando..." : "Salvar lançamento"}
      </button>
    </form>
  );
}
