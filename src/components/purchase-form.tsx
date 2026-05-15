"use client";

import { useActionState } from "react";
import { AlertTriangle, CheckCircle2, PackagePlus } from "lucide-react";
import { createPurchaseAction } from "@/app/(app)/actions/finance";

type Variant = { id: string; sku: string; color: string; size: string; stockQuantity: number; productName: string };
type Supplier = { id: string; name: string };

type Props = {
  suppliers: Supplier[];
  variants: Variant[];
};

export function PurchaseForm({ suppliers, variants }: Props) {
  const [state, action, pending] = useActionState(createPurchaseAction, null);

  return (
    <form action={action} className="surface-card grid gap-4 p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-warning to-accent text-fg">
          <PackagePlus size={17} strokeWidth={2.1} />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Nova compra</h2>
          <p className="text-[0.76rem] font-normal text-muted">Reposição automatizada com entrada no estoque.</p>
        </div>
      </div>

      {state?.error && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-[0.84rem] font-medium text-danger">
          <AlertTriangle size={14} className="shrink-0" />
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success-soft px-4 py-3 text-[0.84rem] font-medium text-success">
          <CheckCircle2 size={14} className="shrink-0" />
          Compra registrada com sucesso!
        </div>
      )}

      <label className="label">
        Fornecedor
        <select className="field" name="supplierId">
          <option value="">Sem fornecedor</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </label>
      <label className="label">
        Produto
        {variants.length === 0 ? (
          <div className="field flex items-center gap-2 text-muted">
            <AlertTriangle size={14} className="text-warning shrink-0" />
            Cadastre produtos primeiro em &ldquo;Produtos&rdquo;
          </div>
        ) : (
          <select className="field" name="variantId" required>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.productName} · {v.color}/{v.size} · {v.sku} · {v.stockQuantity} un.
              </option>
            ))}
          </select>
        )}
      </label>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="label">Qtd.<input className="field" name="quantity" type="number" min="1" required /></label>
        <label className="label">Custo un.<input className="field" name="unitCost" type="number" min="0" step="0.01" required /></label>
        <label className="label">Frete<input className="field" name="freight" type="number" min="0" step="0.01" defaultValue="0" /></label>
      </div>
      <button className="button-primary" disabled={pending}>
        {pending ? "Registrando..." : "Receber mercadoria"}
      </button>
    </form>
  );
}
