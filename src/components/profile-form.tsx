"use client";

import { useActionState } from "react";
import { CheckCircle2, KeyRound, Mail, User } from "lucide-react";
import { updateProfileAction } from "@/app/(app)/actions/settings";

type Props = {
  initialName: string;
  initialEmail: string;
};

export function ProfileForm({ initialName, initialEmail }: Props) {
  const [state, action, pending] = useActionState(updateProfileAction, null);

  return (
    <form action={action} className="grid gap-4">
      <label className="label">
        Seu nome
        <span className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" size={17} strokeWidth={2.1} />
          <input className="field pl-10" name="name" defaultValue={initialName} required minLength={2} />
        </span>
      </label>

      <label className="label">
        E-mail de acesso
        <span className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" size={17} strokeWidth={2.1} />
          <input className="field pl-10" name="email" type="email" defaultValue={initialEmail} required />
        </span>
      </label>

      <div className="h-px bg-border" />

      <p className="text-[0.78rem] font-medium text-muted">
        Deixe os campos de nova senha em branco para manter a senha atual.
      </p>

      <label className="label">
        Senha atual <span className="text-danger">*</span>
        <span className="relative">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" size={17} strokeWidth={2.1} />
          <input className="field pl-10" name="currentPassword" type="password" placeholder="Confirme sua identidade" required />
        </span>
      </label>

      <label className="label">
        Nova senha
        <span className="relative">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" size={17} strokeWidth={2.1} />
          <input className="field pl-10" name="newPassword" type="password" placeholder="Mínimo 8 caracteres" minLength={8} />
        </span>
      </label>

      <label className="label">
        Confirmar nova senha
        <span className="relative">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" size={17} strokeWidth={2.1} />
          <input className="field pl-10" name="confirmPassword" type="password" placeholder="Repita a nova senha" minLength={8} />
        </span>
      </label>

      {state?.error ? (
        <p className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-[0.86rem] font-medium text-danger">
          {state.error}
        </p>
      ) : null}

      {state?.success ? (
        <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success-soft px-4 py-3 text-[0.86rem] font-medium text-success">
          <CheckCircle2 size={16} strokeWidth={2.1} />
          Dados atualizados com sucesso!
        </div>
      ) : null}

      <button className="button-primary mt-1" disabled={pending}>
        {pending ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}
