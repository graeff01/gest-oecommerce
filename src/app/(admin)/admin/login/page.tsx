"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ secret })
      });

      if (res.ok) {
        router.push("/admin");
      } else {
        setError("Senha incorreta.");
      }
    });
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-surface p-4">
      <form onSubmit={handleSubmit} className="surface-card grid w-full max-w-sm gap-5 p-8">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-2 text-primary-fg shadow-glow">
            <ShieldCheck size={20} strokeWidth={2.1} />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight text-fg">Painel Master</h1>
            <p className="text-[0.76rem] text-muted">Acesso restrito ao administrador.</p>
          </div>
        </div>

        <label className="label">
          Senha de acesso
          <input
            className="field"
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            required
            autoFocus
          />
        </label>

        {error && <p className="text-[0.82rem] text-danger">{error}</p>}

        <button type="submit" disabled={pending} className="button-primary">
          {pending ? "Verificando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
