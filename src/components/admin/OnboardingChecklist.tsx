"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { toggleOnboardingItemAction } from "@/app/(admin)/admin/actions";

export type OnboardingItemDTO = {
  id: string;
  title: string;
  description: string | null;
  done: boolean;
};

export function OnboardingChecklist({ items }: { items: OnboardingItemDTO[] }) {
  const [local, setLocal] = useState(items);
  const [pending, startTransition] = useTransition();
  const done = local.filter((item) => item.done).length;
  const pct = local.length ? Math.round((done / local.length) * 100) : 0;

  function toggle(id: string) {
    setLocal((current) => current.map((item) => item.id === id ? { ...item, done: !item.done } : item));
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      await toggleOnboardingItemAction(fd);
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-bold tracking-tight text-fg">Checklist de onboarding</h3>
          <p className="text-[0.72rem] text-muted">{done}/{local.length} concluido(s)</p>
        </div>
        <strong className="rounded-xl border border-primary/20 bg-primary-soft px-3 py-1 text-xs text-primary">{pct}%</strong>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-surface-3/40">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="grid gap-2">
        {local.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={pending}
            onClick={() => toggle(item.id)}
            className="flex items-start gap-3 rounded-xl border border-border bg-surface-2/30 p-3 text-left transition hover:border-primary/30 hover:bg-primary-soft/25 disabled:opacity-70"
          >
            {item.done ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" /> : <Circle size={16} className="mt-0.5 shrink-0 text-muted" />}
            <span className="min-w-0">
              <span className={`block text-[0.78rem] font-bold ${item.done ? "text-success" : "text-fg"}`}>{item.title}</span>
              {item.description ? <span className="mt-0.5 block text-[0.7rem] text-muted">{item.description}</span> : null}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
