"use client";

import { useState, useMemo } from "react";
import { AlertTriangle, Plus, ReceiptText, Trash2 } from "lucide-react";
import { createOrderAction } from "@/app/(app)/actions/orders";
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

type CartItem = {
  variantId: string;
  label: string;
  unitPrice: number;
  quantity: number;
  maxStock: number;
};

function nextMonthDate(base: Date, plusMonths: number): string {
  const d = new Date(base.getFullYear(), base.getMonth() + plusMonths, base.getDate());
  return d.toISOString().slice(0, 10);
}

export function OrderForm({ customers, variants }: { customers: Customer[]; variants: Variant[] }) {
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id ?? "");
  const [addQty, setAddQty] = useState(1);

  // crediário
  const [installmentCount, setInstallmentCount] = useState(2);
  const [dueDates, setDueDates] = useState<string[]>([]);

  const isCrediario = paymentMethod === "CREDIARIO";
  const today = new Date();

  // reconstrói dueDates quando muda qtd de parcelas
  function updateInstallmentCount(n: number) {
    setInstallmentCount(n);
    setDueDates(Array.from({ length: n }, (_, i) => nextMonthDate(today, i + 1)));
  }

  function setDueDate(index: number, value: string) {
    setDueDates((prev) => prev.map((d, i) => (i === index ? value : d)));
  }

  // inicializa datas quando muda para crediário
  function handlePaymentChange(v: string) {
    setPaymentMethod(v);
    if (v === "CREDIARIO" && dueDates.length === 0) {
      setDueDates(Array.from({ length: installmentCount }, (_, i) => nextMonthDate(today, i + 1)));
    }
  }

  const inStock = variants.filter((v) => v.stockQuantity > 0);
  const outOfStock = variants.filter((v) => v.stockQuantity <= 0);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);

  function addToCart() {
    if (!selectedVariant) return;
    const price = Number(selectedVariant.salePrice);
    setCart((prev) => {
      const existing = prev.find((item) => item.variantId === selectedVariantId);
      if (existing) {
        const newQty = existing.quantity + addQty;
        if (newQty > existing.maxStock) return prev;
        return prev.map((item) =>
          item.variantId === selectedVariantId ? { ...item, quantity: newQty } : item
        );
      }
      return [
        ...prev,
        {
          variantId: selectedVariantId,
          label: `${selectedVariant.product.name} · ${selectedVariant.color}/${selectedVariant.size}`,
          unitPrice: price,
          quantity: addQty,
          maxStock: selectedVariant.stockQuantity
        }
      ];
    });
    setAddQty(1);
  }

  function removeFromCart(variantId: string) {
    setCart((prev) => prev.filter((item) => item.variantId !== variantId));
  }

  function updateCartQty(variantId: string, qty: number) {
    setCart((prev) =>
      prev.map((item) =>
        item.variantId === variantId
          ? { ...item, quantity: Math.max(1, Math.min(qty, item.maxStock)) }
          : item
      )
    );
  }

  const [discount, setDiscount] = useState(0);
  const [fee, setFee] = useState(0);

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [cart]
  );

  const orderTotal = useMemo(
    () => Math.max(0, cartTotal - discount + fee),
    [cartTotal, discount, fee]
  );

  // submete: injeta cart como JSON num input hidden, instalment dates como JSON
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (cart.length === 0) {
      e.preventDefault();
      alert("Adicione ao menos um produto antes de registrar a venda.");
      return;
    }
    // inject items
    const form = e.currentTarget;
    let itemsInput = form.querySelector<HTMLInputElement>('input[name="items"]');
    if (!itemsInput) {
      itemsInput = document.createElement("input");
      itemsInput.type = "hidden";
      itemsInput.name = "items";
      form.appendChild(itemsInput);
    }
    itemsInput.value = JSON.stringify(cart.map((item) => ({ variantId: item.variantId, quantity: item.quantity })));

    // inject due dates
    let datesInput = form.querySelector<HTMLInputElement>('input[name="dueDates"]');
    if (!datesInput) {
      datesInput = document.createElement("input");
      datesInput.type = "hidden";
      datesInput.name = "dueDates";
      form.appendChild(datesInput);
    }
    datesInput.value = isCrediario ? JSON.stringify(dueDates) : "";
  }

  const cartSubtotal = cartTotal; // kept for the subtotal line in cart summary

  return (
    <form
      action={createOrderAction}
      onSubmit={handleSubmit}
      className="surface-card grid gap-4 p-5"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-2 text-primary-fg shadow-glow">
          <ReceiptText size={17} strokeWidth={2.1} />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Nova venda</h2>
          <p className="text-[0.76rem] font-normal text-muted">Adicione produtos, escolha o pagamento e confirme.</p>
        </div>
      </div>

      {/* cliente */}
      <label className="label">
        Cliente {isCrediario ? <span className="text-danger">*</span> : null}
        <select className="field" name="customerId" required={isCrediario}>
          <option value="">{isCrediario ? "Selecione um cliente" : "Venda avulsa"}</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      {/* adicionar produto ao carrinho */}
      <div className="grid gap-2 rounded-xl border border-border bg-surface-2/40 p-3">
        <p className="text-[0.74rem] font-semibold uppercase tracking-wide text-muted">Produtos</p>

        {variants.length === 0 ? (
          <div className="flex items-center gap-2 text-[0.86rem] text-muted">
            <AlertTriangle size={14} className="shrink-0 text-warning" />
            Nenhum produto cadastrado ainda
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              className="field flex-1"
              value={selectedVariantId}
              onChange={(e) => setSelectedVariantId(e.target.value)}
            >
              {inStock.length > 0 && (
                <optgroup label="— Em estoque">
                  {inStock.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.product.name} · {v.color}/{v.size} · {money(v.salePrice)} · {v.stockQuantity} un.
                    </option>
                  ))}
                </optgroup>
              )}
              {outOfStock.length > 0 && (
                <optgroup label="— Sem estoque">
                  {outOfStock.map((v) => (
                    <option key={v.id} value={v.id} disabled>
                      {v.product.name} · {v.color}/{v.size} · esgotado
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <input
              className="field w-20 shrink-0"
              type="number"
              min="1"
              max={selectedVariant?.stockQuantity ?? 1}
              value={addQty}
              onChange={(e) => setAddQty(Math.max(1, Number(e.target.value)))}
            />
            <button
              type="button"
              onClick={addToCart}
              disabled={!selectedVariantId || !selectedVariant || selectedVariant.stockQuantity <= 0}
              className="button-primary shrink-0 px-3"
            >
              <Plus size={15} strokeWidth={2.4} />
              Adicionar
            </button>
          </div>
        )}

        {/* lista do carrinho */}
        {cart.length > 0 && (
          <div className="mt-1 grid gap-1.5">
            {cart.map((item) => (
              <div
                key={item.variantId}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2"
              >
                <p className="min-w-0 truncate text-[0.83rem] font-medium text-fg">{item.label}</p>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[0.78rem] text-muted">{money(item.unitPrice)}</span>
                  <input
                    className="field h-7 w-14 py-0 text-center text-xs"
                    type="number"
                    min="1"
                    max={item.maxStock}
                    value={item.quantity}
                    onChange={(e) => updateCartQty(item.variantId, Number(e.target.value))}
                  />
                  <span className="text-[0.78rem] font-semibold text-fg">{money(item.unitPrice * item.quantity)}</span>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.variantId)}
                    className="grid h-6 w-6 place-items-center rounded-md text-muted hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-end gap-2 border-t border-border pt-2">
              <span className="text-[0.78rem] text-muted">Subtotal</span>
              <span className="text-[0.92rem] font-semibold text-fg">{money(cartSubtotal)}</span>
            </div>
          </div>
        )}
      </div>

      {/* canal, desconto, taxa */}
      <div className="grid gap-3 md:grid-cols-3">
        <label className="label md:col-span-1">
          Canal<input className="field" name="channel" defaultValue="Instagram" required />
        </label>
        <label className="label">
          Desconto (R$)
          <input
            className="field"
            name="discount"
            type="number"
            min="0"
            max={cartTotal}
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
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
            value={fee}
            onChange={(e) => setFee(Math.max(0, Number(e.target.value)))}
          />
        </label>
      </div>

      {/* resumo do total quando há desconto ou taxa */}
      {(discount > 0 || fee > 0) && cart.length > 0 && (
        <div className="flex items-center justify-end gap-3 rounded-xl border border-border bg-surface-2/40 px-4 py-2.5 text-[0.83rem]">
          <span className="text-muted">Subtotal</span>
          <span className="font-medium text-fg">{money(cartTotal)}</span>
          {discount > 0 && (
            <>
              <span className="text-muted">- Desconto</span>
              <span className="font-medium text-success">− {money(discount)}</span>
            </>
          )}
          {fee > 0 && (
            <>
              <span className="text-muted">+ Taxa</span>
              <span className="font-medium text-warning">+ {money(fee)}</span>
            </>
          )}
          <span className="text-muted">= Total</span>
          <span className="font-semibold text-fg">{money(orderTotal)}</span>
        </div>
      )}

      {/* pagamento */}
      <label className="label">
        Pagamento
        <select
          className="field"
          name="paymentMethod"
          required
          value={paymentMethod}
          onChange={(e) => handlePaymentChange(e.target.value)}
        >
          <option value="PIX">Pix</option>
          <option value="CREDIT_CARD">Cartão crédito</option>
          <option value="DEBIT_CARD">Cartão débito</option>
          <option value="CASH">Dinheiro</option>
          <option value="MARKETPLACE">Marketplace</option>
          <option value="CREDIARIO">Crediário (parcelado direto)</option>
        </select>
      </label>

      {/* crediário — parcelas com datas livres */}
      {isCrediario && (
        <div className="grid gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[0.78rem] font-semibold text-fg">Parcelas do crediário</p>
            <div className="flex items-center gap-2">
              <span className="text-[0.74rem] text-muted">Qtd.:</span>
              <input
                className="field h-8 w-16 py-0 text-center text-sm"
                type="number"
                min="1"
                max="36"
                value={installmentCount}
                onChange={(e) => updateInstallmentCount(Math.max(1, Math.min(36, Number(e.target.value))))}
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {dueDates.map((d, i) => {
              const parcValue = orderTotal / installmentCount;
              return (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
                  <span className="w-16 shrink-0 text-[0.74rem] font-semibold text-muted">
                    {i + 1}/{installmentCount}
                    <span className="ml-1 font-normal text-fg">{money(parcValue)}</span>
                  </span>
                  <input
                    className="field h-8 flex-1 py-0 text-xs"
                    type="date"
                    value={d}
                    onChange={(e) => setDueDate(i, e.target.value)}
                    required
                  />
                </div>
              );
            })}
          </div>

          <p className="text-[0.72rem] text-muted">
            Receita só entra no financeiro quando você marcar cada parcela como paga.
          </p>
        </div>
      )}

      <label className="label">
        Observações<textarea className="field min-h-16" name="notes" />
      </label>

      <button className="button-primary" disabled={cart.length === 0}>
        Registrar venda {cart.length > 0 ? `· ${money(orderTotal)}` : ""}
      </button>
    </form>
  );
}
