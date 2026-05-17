"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="hidden items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-[0.78rem] font-semibold text-white/70 transition hover:bg-white/10 hover:text-white md:inline-flex"
      title="Imprimir / salvar como PDF"
    >
      <Printer size={13} /> Relatorio
    </button>
  );
}
