"use client";

import { useState } from "react";
import { Building2, Pencil, X } from "lucide-react";

type AdminDialogIcon = "building" | "pencil";

function DialogIcon({ icon }: { icon: AdminDialogIcon }) {
  if (icon === "pencil") return <Pencil size={17} />;
  return <Building2 size={18} />;
}

export function AdminFormDialog({
  label,
  title,
  description,
  icon,
  tone = "primary",
  children
}: {
  label: string;
  title: string;
  description: string;
  icon: AdminDialogIcon;
  tone?: "primary" | "secondary";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const buttonClass =
    tone === "primary"
      ? "button-primary h-10 px-4 py-0 text-sm"
      : "button-secondary h-9 px-3 py-0 text-xs";

  return (
    <>
      <button type="button" className={buttonClass} onClick={() => setOpen(true)}>
        <DialogIcon icon={icon} /> {label}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-fg/35 p-3 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-elevated shadow-elev">
            <div className="flex items-start justify-between gap-4 border-b border-border bg-surface-2/60 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                  <DialogIcon icon={icon} />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate font-display text-lg font-semibold tracking-tight text-fg">{title}</h2>
                  <p className="text-[0.78rem] text-muted">{description}</p>
                </div>
              </div>
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-surface text-muted transition hover:text-danger"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto p-4">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
