"use client";

import { useState } from "react";
import { ReceiptText } from "lucide-react";
import { createOrderAction } from "@/app/(app)/actions";
import { money } from "@/lib/format";

type Customer = { id: string; name: string };
type Variant = {
  id: string;
  color: string;
  size: string;
  salePrice: number | string | { toString(): string };
  stockQuantity: number;
  product: { name: string };
};

export function OrderForm({ customers, variants }: { customers: Customer[]; variants: Variant[] }) {
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const isCrediario = paymentMethod === "CREDIARIO";

  const today = new Date();
  const defaultFirstDue = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())
    .toISOString()
    .slice(0, 10);

  return (
    <form action={createOrderAction} className="surface-card grid gap-4 p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-2 text-primary-fg shadow-glow">
          <ReceiptText size={17} strokeWidth={2.1} />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Nova venda</h2>
          <p className="text-[0.76rem] font-normal text-muted">Baixa de estoque automática após confirmar.</p>
        </div>
      </div>
      <label className="label">
        Cliente {isCrediario ? <span className="text-danger">*</span> : null}
        <select className="field" name="customerId" required={isCrediario}>
          <option value="">{isCrediario ? "Selecione um cliente" : "Venda avulsa"}</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      </label>
      <label className="label">
        Produto
        <select className="field" name="variantId" required>
          {variants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {variant.product.name} · {variant.color}/{variant.size} · {money(variant.salePrice)} · {variant.stockQuantity} un.
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="label">
          Quantidade<input className="field" name="quantity" type="number" min="1" defaultValue="1" required />
        </label>
        <label className="label">
          Canal<input className="field" name="channel" defaultValue="Instagram" required />
        </label>
        <label className="label">
          Desconto<input className="field" name="discount" type="number" min="0" step="0.01" defaultValue="0" />
        </label>
        <label className="label">
          Taxa<input className="field" name="fee" type="number" min="0" step="0.01" defaultValue="0" />
        </label>
      </div>
      <label className="label">
        Pagamento
        <select
          className="field"
          name="paymentMethod"
          required
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        >
          <option value="PIX">Pix</option>
          <option value="CREDIT_CARD">Cartão crédito</option>
          <option value="DEBIT_CARD">Cartão débito</option>
          <option value="CASH">Dinheiro</option>
          <option value="MARKETPLACE">Marketplace</option>
          <option value="CREDIARIO">Crediário (parcelado direto)</option>
        </select>
      </label>
      {isCrediario ? (
        <div className="grid gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4 md:grid-cols-2">
          <label className="label">
            Parcelas
            <input
              className="field"
              name="installmentCount"
              type="number"
              min="1"
              max="36"
              defaultValue="3"
              required
            />
          </label>
          <label className="label">
            1º vencimento
            <input className="field" name="firstDueDate" type="date" defaultValue={defaultFirstDue} required />
          </label>
          <p className="md:col-span-2 text-[0.72rem] text-muted">
            Receita só entra no financeiro quando você marcar cada parcela como paga.
          </p>
        </div>
      ) : null}
      <label className="label">
        Observações<textarea className="field min-h-20" name="notes" />
      </label>
      <button className="button-primary">Registrar venda</button>
    </form>
  );
}
