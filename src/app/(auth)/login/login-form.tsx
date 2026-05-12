"use client";

import { useActionState } from "react";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { loginAction } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <form action={action} className="grid gap-4">
      <label className="label">
        E-mail
        <span className="relative">
          <Mail
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle"
            size={17}
            strokeWidth={2.1}
          />
          <input className="field pl-10" name="email" type="email" placeholder="admin@loja.com" required />
        </span>
      </label>
      <label className="label">
        Senha
        <span className="relative">
          <LockKeyhole
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle"
            size={17}
            strokeWidth={2.1}
          />
          <input
            className="field pl-10"
            name="password"
            type="password"
            placeholder="Admin@12345"
            minLength={8}
            required
          />
        </span>
      </label>
      {state?.error ? (
        <p className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-[0.86rem] font-medium text-danger">
          {state.error}
        </p>
      ) : null}
      <button className="button-primary mt-2" disabled={pending}>
        {pending ? "Entrando..." : "Entrar no sistema"}
        <ArrowRight size={17} strokeWidth={2.2} />
      </button>
    </form>
  );
}
