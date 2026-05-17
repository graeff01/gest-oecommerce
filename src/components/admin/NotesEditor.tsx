"use client";

import { useState } from "react";
import { Check, Save, Sparkles } from "lucide-react";
import { updateClientNotesAction } from "@/app/(admin)/admin/actions";

export function NotesEditor({ clientId, initial }: { clientId: string; initial: string | null }) {
  const [value, setValue] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const dirty = value !== (initial ?? "");

  async function save() {
    setSaving(true);
    const fd = new FormData();
    fd.set("id", clientId);
    fd.set("notes", value);
    try {
      await updateClientNotesAction(fd);
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-accent" />
          <h3 className="font-display text-sm font-bold tracking-tight text-fg">Notas do cliente</h3>
        </div>
        {savedAt && !dirty && (
          <span className="inline-flex items-center gap-1 text-[0.66rem] font-semibold text-success">
            <Check size={11} /> Salvo {savedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Contexto, decisoes, historico... Tudo que voce nao quer esquecer sobre esse cliente."
        className="min-h-32 w-full rounded-xl border border-border bg-surface-2/30 px-3 py-2 text-[0.84rem] leading-relaxed text-fg outline-none transition focus:border-primary"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[0.66rem] text-muted">{value.length} caracteres</span>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          <Save size={11} /> {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}
