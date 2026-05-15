"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

type Props = {
  categories: string[];
  defaultValue?: string;
  name: string;
  required?: boolean;
};

export function FinanceCategorySelect({ categories, defaultValue, name, required }: Props) {
  const [showCustom, setShowCustom] = useState(
    !!defaultValue && !categories.includes(defaultValue)
  );
  const [value, setValue] = useState(defaultValue ?? "");

  if (showCustom) {
    return (
      <div className="flex gap-2">
        <input
          className="field flex-1"
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Digite a categoria"
          required={required}
          autoFocus
        />
        <button
          type="button"
          onClick={() => { setShowCustom(false); setValue(""); }}
          className="rounded-xl border border-border px-3 text-xs text-muted hover:text-fg transition"
        >
          ←
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <select
        className="field flex-1"
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required={required}
      >
        <option value="">Selecione...</option>
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => setShowCustom(true)}
        title="Digitar nova categoria"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-surface-2 text-muted transition hover:border-primary/30 hover:text-primary"
      >
        <Plus size={14} strokeWidth={2.4} />
      </button>
    </div>
  );
}
