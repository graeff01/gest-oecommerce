"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Shirt, X } from "lucide-react";
import { createProductAction } from "@/app/(app)/actions/products";

export function ProductCreateModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group fixed bottom-[6rem] right-5 z-30 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-2 text-primary-fg shadow-[0_18px_42px_-12px_rgb(var(--primary)/0.65)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_52px_-14px_rgb(var(--primary)/0.7)] lg:bottom-8"
        title="Cadastrar produto"
      >
        <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
        <Plus size={22} strokeWidth={2.4} className="relative" />
        <span className="pointer-events-none absolute inset-0 animate-glow rounded-2xl" />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-40 grid place-items-center bg-fg/40 p-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.form
              action={createProductAction}
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.22, 0.9, 0.32, 1] }}
              className="grid w-full max-w-3xl max-h-[92dvh] gap-0 overflow-y-auto overflow-x-hidden rounded-3xl border border-border bg-elevated shadow-elev"
              onClick={(event) => event.stopPropagation()}
            >
              {/* header com gradient */}
              <div className="relative flex items-start justify-between gap-4 overflow-hidden bg-gradient-to-br from-primary via-primary to-primary-2 p-5 text-primary-fg">
                <span className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
                <span className="pointer-events-none absolute -bottom-10 left-10 h-24 w-24 rounded-full bg-accent/30 blur-2xl" />
                <div className="relative flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 backdrop-blur-sm">
                    <Shirt size={20} strokeWidth={2.1} />
                  </span>
                  <div>
                    <h2 className="font-display text-xl font-semibold tracking-tight">Novo produto</h2>
                    <p className="text-[0.82rem] font-normal text-primary-fg/80">
                      Cadastre o modelo base. As variações entram dentro dele.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="relative grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-primary-fg transition hover:bg-white/20"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="grid gap-4 p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                    <Shirt size={17} strokeWidth={2.1} />
                  </span>
                  <div>
                    <h3 className="font-display text-base font-semibold tracking-tight text-fg">Dados comerciais</h3>
                    <p className="text-[0.74rem] font-normal text-muted">
                      Nome, seção e tags usadas para organizar o catálogo.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="label sm:col-span-2">
                    Nome do produto<input className="field" name="name" placeholder="Ex: Tênis urbano couro" required />
                  </label>
                  <label className="label">
                    Categoria<input className="field" name="category" placeholder="Roupas, Calçados" required />
                  </label>
                  <label className="label">
                    Marca<input className="field" name="brand" placeholder="Opcional" />
                  </label>
                  <label className="label">
                    Gênero<input className="field" name="gender" placeholder="Feminino, Masculino, Unissex" />
                  </label>
                  <label className="label">
                    Tags<input className="field" name="tags" placeholder="tenis, casual, verao, premium" />
                  </label>
                  <input type="hidden" name="imageUrl" value="" />
                </div>

                <button className="button-primary">Cadastrar produto</button>
              </div>
            </motion.form>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
