"use client";

import { useActionState } from "react";
import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import { createUserAction } from "@/app/(app)/actions/settings";

export function SettingsUserForm() {
  const [state, action, pending] = useActionState(createUserAction, null);

  return (
    <form action={action} className="surface-card grid gap-4 p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-success to-success/70 text-primary-fg">
          <ShieldCheck size={17} strokeWidth={2.1} />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Novo usuário</h2>
          <p className="text-[0.76rem] font-normal text-muted">Crie acessos com perfil específico.</p>
        </div>
      </div>
      <label className="label">
        Nome<input className="field" name="name" required />
      </label>
      <label className="label">
        E-mail<input className="field" name="email" type="email" required />
      </label>
      <label className="label">
        Senha<input className="field" name="password" type="password" minLength={8} required />
      </label>
      <label className="label">
        Perfil
        <select className="field" name="role">
          <option value="ADMIN">Administrador</option>
          <option value="FINANCE">Financeiro</option>
          <option value="STOCK">Estoque</option>
          <option value="SALES">Vendas</option>
        </select>
      </label>

      {state?.error && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/20 bg-danger-soft px-3 py-2 text-[0.82rem] text-danger">
          <AlertTriangle size={13} className="shrink-0" />{state.error}
        </div>
      )}
      {state?.success && (
        <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success-soft px-3 py-2 text-[0.82rem] text-success">
          <CheckCircle2 size={13} className="shrink-0" />Usuário criado com sucesso!
        </div>
      )}

      <button className="button-primary" disabled={pending}>
        {pending ? "Criando..." : "Criar usuário"}
      </button>
    </form>
  );
}
