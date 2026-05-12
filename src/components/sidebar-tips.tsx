"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const tips = [
  {
    label: "Estoque automático",
    text: "Ao registrar uma venda, o sistema baixa a unidade vendida sozinho."
  },
  {
    label: "Entrada de mercadoria",
    text: "Use Compras para repor produtos e atualizar custo, estoque e financeiro."
  },
  {
    label: "Produtos com grade",
    text: "Cadastre o produto uma vez e controle cor, tamanho e SKU nas variações."
  },
  {
    label: "Financeiro limpo",
    text: "Vendas geram receitas. Compras e despesas entram como gastos."
  }
];

export function SidebarTips() {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const current = tips[index];

  const fullText = useMemo(() => current.text, [current.text]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setIndex((value) => (value + 1) % tips.length);
    }, 5400);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setTyped("");
    let position = 0;
    const interval = window.setInterval(() => {
      position += 1;
      setTyped(fullText.slice(0, position));
      if (position >= fullText.length) window.clearInterval(interval);
    }, 22);
    return () => window.clearInterval(interval);
  }, [fullText]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary-soft/70 to-surface-2 p-3.5">
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/10 blur-2xl" />
      <div className="absolute -bottom-8 -left-4 h-16 w-16 rounded-full bg-accent/15 blur-2xl" />

      <div className="relative">
        <div className="mb-2 flex items-center gap-1.5">
          <Sparkles size={12} className="text-primary" />
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-primary">Dica do dia</p>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={current.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.24 }}
          >
            <p className="text-[0.78rem] font-semibold leading-tight text-fg">{current.label}</p>
            <p className="mt-1 min-h-[34px] text-[0.72rem] font-normal leading-[1.45] text-muted">
              {typed}
              <span className="ml-0.5 inline-block h-2.5 w-[2px] translate-y-[2px] animate-pulse rounded bg-primary" />
            </p>
          </motion.div>
        </AnimatePresence>
        <div className="mt-2.5 flex gap-1">
          {tips.map((tip, tipIndex) => (
            <span
              key={tip.label}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                tipIndex === index
                  ? "bg-gradient-to-r from-primary to-primary-2"
                  : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
