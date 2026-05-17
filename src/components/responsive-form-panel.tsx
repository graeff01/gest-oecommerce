"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";

export function ResponsiveFormPanel({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="hidden xl:block xl:sticky xl:top-4">{children}</div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(6.15rem+env(safe-area-inset-bottom))] right-3 z-30 inline-flex h-12 min-h-12 max-w-[calc(100vw-1.5rem)] items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-primary-2 px-3 font-semibold text-primary-fg shadow-[0_18px_42px_-12px_rgb(var(--primary)/0.65)] transition hover:-translate-y-0.5 min-[430px]:right-4 min-[430px]:h-auto min-[430px]:px-4 xl:hidden"
        title={title}
      >
        <Plus size={18} strokeWidth={2.4} />
        <span className="hidden text-sm min-[430px]:inline">{title}</span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-end bg-fg/45 backdrop-blur-md xl:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 28, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 28, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 0.9, 0.32, 1] }}
              className="flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-elevated shadow-elev"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/80 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted">Cadastro</p>
                  <h2 className="truncate font-display text-lg font-semibold tracking-tight text-fg">{title}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted transition hover:bg-danger-soft hover:text-danger"
                  title="Fechar"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                {children}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
