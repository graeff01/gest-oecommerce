"use client";

import { useState } from "react";
import { Check, Copy, Mail, MessageCircle, Phone } from "lucide-react";

export type ContactQuickActionsProps = {
  storeName: string;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  monthlyFee?: number | null;
  renewalDay?: number | null;
  variant?: "card" | "row";
};

function digits(s?: string | null): string {
  return (s ?? "").replace(/\D/g, "");
}

function buildWhatsappUrl(phone: string, message: string): string {
  const text = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${text}`;
}

function buildMailto(email: string, subject: string, body: string): string {
  const s = encodeURIComponent(subject);
  const b = encodeURIComponent(body);
  return `mailto:${email}?subject=${s}&body=${b}`;
}

function moneyBR(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

export function ContactQuickActions(props: ContactQuickActionsProps) {
  const {
    storeName,
    contactName,
    contactPhone,
    contactEmail,
    monthlyFee,
    renewalDay,
    variant = "row"
  } = props;
  const [copied, setCopied] = useState<string | null>(null);

  const phone = digits(contactPhone);
  const hasPhone = phone.length >= 10;
  const hasEmail = !!contactEmail?.trim();
  const greeting = contactName ? `Ola, ${contactName.split(" ")[0]}!` : `Ola!`;
  const fee = monthlyFee ?? 0;

  const templates = {
    invoice: `${greeting} Aqui e do time gestor da ${storeName}. Passando para lembrar que a sua mensalidade${
      fee ? ` de ${moneyBR(fee)}` : ""
    }${renewalDay ? ` vence dia ${renewalDay}` : ""}. Posso te enviar o link de pagamento?`,
    checkin: `${greeting} Tudo bem? Estou passando para um check-in rapido sobre a operacao da ${storeName}. Tem algo que posso ajudar essa semana?`,
    alert: `${greeting} Identifiquei um ponto de atencao no sistema da ${storeName} e queria alinhar contigo. Pode me dar uns minutinhos hoje?`,
    upgrade: `${greeting} Vi aqui que a ${storeName} esta crescendo bem. Quero te apresentar um plano com mais recursos que vai te ajudar a escalar. Posso te chamar?`,
    congrats: `${greeting} Parabens pelos resultados da ${storeName} na ultima semana! Time muito feliz com a parceria!`
  };

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied((c) => (c === label ? null : c)), 1500);
    } catch {
      /* noop */
    }
  }

  function openWhats(message: string) {
    if (!hasPhone) return;
    window.open(buildWhatsappUrl(phone, message), "_blank", "noopener,noreferrer");
  }

  if (variant === "row") {
    return (
      <div className="flex flex-wrap gap-1.5">
        {hasPhone && (
          <button
            type="button"
            onClick={() => openWhats(templates.checkin)}
            className="inline-flex h-7 items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 text-[0.7rem] font-semibold text-emerald-700 transition hover:bg-emerald-500/15 dark:text-emerald-300"
            title={`WhatsApp ${phone}`}
          >
            <MessageCircle size={11} /> WhatsApp
          </button>
        )}
        {hasEmail && (
          <a
            href={buildMailto(contactEmail!, `Contato - ${storeName}`, templates.checkin)}
            className="inline-flex h-7 items-center gap-1 rounded-xl border border-sky-500/30 bg-sky-500/10 px-2.5 text-[0.7rem] font-semibold text-sky-700 transition hover:bg-sky-500/15 dark:text-sky-300"
            title={contactEmail!}
          >
            <Mail size={11} /> Email
          </a>
        )}
        {hasPhone && (
          <button
            type="button"
            onClick={() => copy("phone", phone)}
            className="inline-flex h-7 items-center gap-1 rounded-xl border border-border bg-surface-2/40 px-2.5 text-[0.7rem] font-semibold text-muted transition hover:bg-surface-2"
            title="Copiar telefone"
          >
            {copied === "phone" ? <Check size={11} /> : <Copy size={11} />}
            {phone.slice(-4)}
          </button>
        )}
      </div>
    );
  }

  // card variant - full panel with templates
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-bold tracking-tight text-fg">Contato direto</h3>
          {contactName && <p className="text-[0.72rem] text-muted">Falar com {contactName}</p>}
        </div>
      </div>

      {!hasPhone && !hasEmail ? (
        <div className="rounded-xl border border-dashed border-border bg-surface-2/30 p-3 text-[0.78rem] text-muted">
          Cadastre telefone ou e-mail nos dados do cliente para liberar contato em 1 clique.
        </div>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {hasPhone && (
              <button
                type="button"
                onClick={() => copy("phone-full", phone)}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface-2/30 px-3 py-2 text-left transition hover:bg-surface-2"
              >
                <span className="flex items-center gap-2 text-[0.78rem] font-semibold text-fg">
                  <Phone size={12} className="text-emerald-600" /> +{phone}
                </span>
                {copied === "phone-full" ? <Check size={12} className="text-success" /> : <Copy size={12} className="text-muted" />}
              </button>
            )}
            {hasEmail && (
              <button
                type="button"
                onClick={() => copy("email", contactEmail!)}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface-2/30 px-3 py-2 text-left transition hover:bg-surface-2"
              >
                <span className="flex min-w-0 items-center gap-2 truncate text-[0.78rem] font-semibold text-fg">
                  <Mail size={12} className="shrink-0 text-sky-600" /> <span className="truncate">{contactEmail}</span>
                </span>
                {copied === "email" ? <Check size={12} className="text-success" /> : <Copy size={12} className="text-muted" />}
              </button>
            )}
          </div>

          <p className="mb-2 text-[0.62rem] font-bold uppercase tracking-widest text-subtle">Mensagens prontas</p>
          <div className="grid gap-1.5">
            {[
              { key: "invoice", icon: "💰", label: "Cobrar mensalidade" },
              { key: "checkin", icon: "👋", label: "Check-in semanal" },
              { key: "alert", icon: "⚠️", label: "Reportar ponto de atencao" },
              { key: "upgrade", icon: "🚀", label: "Propor upgrade" },
              { key: "congrats", icon: "🏆", label: "Parabenizar resultado" }
            ].map((t) => (
              <div key={t.key} className="flex items-center gap-2">
                {hasPhone ? (
                  <button
                    type="button"
                    onClick={() => openWhats(templates[t.key as keyof typeof templates])}
                    className="inline-flex flex-1 items-center justify-between gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-left text-[0.76rem] font-semibold text-emerald-700 transition hover:bg-emerald-500/15 dark:text-emerald-300"
                  >
                    <span>{t.icon} {t.label}</span>
                    <MessageCircle size={12} />
                  </button>
                ) : (
                  <div className="inline-flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface-2/30 px-3 py-2 text-[0.76rem] text-muted">
                    {t.icon} {t.label}
                  </div>
                )}
                {hasEmail && (
                  <a
                    href={buildMailto(contactEmail!, `${t.label} - ${storeName}`, templates[t.key as keyof typeof templates])}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-sky-500/25 bg-sky-500/10 text-sky-700 transition hover:bg-sky-500/15 dark:text-sky-300"
                    title="Enviar por e-mail"
                  >
                    <Mail size={12} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
