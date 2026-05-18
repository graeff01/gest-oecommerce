"use client";

import { useActionState } from "react";
import { AlertTriangle, Building2, CheckCircle2 } from "lucide-react";
import { createSupplierAction, updateSupplierAction } from "@/app/(app)/actions/suppliers";

type SupplierData = {
  id: string;
  name: string;
  document: string | null;
  contact: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

export function SupplierCreateForm() {
  const [state, action, pending] = useActionState(createSupplierAction, null);

  return (
    <form action={action} className="surface-card grid gap-4 p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-info to-primary text-primary-fg shadow-glow">
          <Building2 size={17} strokeWidth={2.1} />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Novo fornecedor</h2>
          <p className="text-[0.76rem] font-normal text-muted">Cadastro com contato e dados fiscais.</p>
        </div>
      </div>
      <label className="label">Nome<input className="field" name="name" required /></label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="label">CNPJ/CPF<input className="field" name="document" /></label>
        <label className="label">Contato<input className="field" name="contact" /></label>
        <label className="label">Telefone<input className="field" name="phone" /></label>
        <label className="label">E-mail<input className="field" name="email" type="email" /></label>
      </div>
      <label className="label">Observações<textarea className="field min-h-16" name="notes" /></label>

      {state?.error && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/20 bg-danger-soft px-3 py-2 text-[0.82rem] text-danger">
          <AlertTriangle size={13} className="shrink-0" />{state.error}
        </div>
      )}
      {state?.success && (
        <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success-soft px-3 py-2 text-[0.82rem] text-success">
          <CheckCircle2 size={13} className="shrink-0" />Fornecedor cadastrado com sucesso!
        </div>
      )}

      <button className="button-primary" disabled={pending}>
        {pending ? "Cadastrando..." : "Cadastrar fornecedor"}
      </button>
    </form>
  );
}

export function SupplierEditForm({ supplier, popoverId }: { supplier: SupplierData; popoverId: string }) {
  const [state, action, pending] = useActionState(updateSupplierAction, null);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={supplier.id} />
      <p className="font-display text-base font-semibold text-fg">Editar fornecedor</p>
      <label className="label">Nome<input className="field" name="name" defaultValue={supplier.name} required /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="label">CNPJ/CPF<input className="field" name="document" defaultValue={supplier.document ?? ""} /></label>
        <label className="label">Contato<input className="field" name="contact" defaultValue={supplier.contact ?? ""} /></label>
        <label className="label">Telefone<input className="field" name="phone" defaultValue={supplier.phone ?? ""} /></label>
        <label className="label">E-mail<input className="field" name="email" type="email" defaultValue={supplier.email ?? ""} /></label>
      </div>
      <label className="label">Observações<textarea className="field min-h-16" name="notes" defaultValue={supplier.notes ?? ""} /></label>

      {state?.error && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/20 bg-danger-soft px-3 py-2 text-[0.82rem] text-danger">
          <AlertTriangle size={13} className="shrink-0" />{state.error}
        </div>
      )}
      {state?.success && (
        <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success-soft px-3 py-2 text-[0.82rem] text-success">
          <CheckCircle2 size={13} className="shrink-0" />Salvo com sucesso!
        </div>
      )}

      <div className="flex gap-2">
        <button type="submit" className="button-primary flex-1" disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          popoverTargetAction="hide"
          popoverTarget={popoverId}
          className="rounded-xl border border-border px-4 py-2 text-sm text-muted hover:text-fg"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
