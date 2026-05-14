"use client";

import { useActionState } from "react";
import { ArrowRight, KeyRound, Mail, ShoppingBag, Store, User } from "lucide-react";
import { setupAction } from "./actions";

export function SetupForm() {
  const [state, action, pending] = useActionState(setupAction, null);

  return (
    <form action={action} className="grid gap-4">
      <label className="label">
        Nome da loja
        <span className="relative">
          <Store className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" size={17} strokeWidth={2.1} />
          <input className="field pl-10" name="storeName" placeholder="Ex: Boutique Aurora" required />
        </span>
      </label>

      <div className="h-px bg-border" />

      <label className="label">
        Seu nome completo
        <span className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" size={17} strokeWidth={2.1} />
          <input className="field pl-10" name="name" placeholder="Ex: Maria Silva" required />
        </span>
      </label>

      <label className="label">
        E-mail de acesso
        <span className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" size={17} strokeWidth={2.1} />
          <input className="field pl-10" name="email" type="email" placeholder="seu@email.com" required />
        </span>
      </label>

      <label className="label">
        Senha
        <span className="relative">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" size={17} strokeWidth={2.1} />
          <input className="field pl-10" name="password" type="password" placeholder="Mínimo 8 caracteres" minLength={8} required />
        </span>
      </label>

      <label className="label">
        Confirmar senha
        <span className="relative">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" size={17} strokeWidth={2.1} />
          <input className="field pl-10" name="confirmPassword" type="password" placeholder="Repita a senha" minLength={8} required />
        </span>
      </label>

      {state?.error ? (
        <p className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-[0.86rem] font-medium text-danger">
          {state.error}
        </p>
      ) : null}

      <button className="button-primary mt-2" disabled={pending}>
        {pending ? "Configurando..." : "Criar minha conta e entrar"}
        <ArrowRight size={17} strokeWidth={2.2} />
      </button>
    </form>
  );
}
