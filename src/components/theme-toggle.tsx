"use client";

import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        title={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
        className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface text-muted transition hover:border-primary/30 hover:text-fg"
      >
        <motion.span
          key={theme}
          initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.28, ease: [0.22, 0.9, 0.32, 1] }}
          className="inline-flex"
        >
          {isDark ? <Moon size={17} /> : <Sun size={17} />}
        </motion.span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={isDark}
      title={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
      className="relative grid h-10 w-[68px] grid-cols-2 items-center rounded-full border border-border bg-surface-2 px-1 transition hover:border-primary/30"
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 480, damping: 32 }}
        className={`absolute top-1 h-8 w-8 rounded-full shadow-soft ${
          isDark ? "left-[calc(100%-2.25rem)] bg-fg" : "left-1 bg-gradient-to-br from-primary to-primary-2"
        }`}
      />
      <span className="relative z-10 grid place-items-center">
        <Sun size={14} className={isDark ? "text-muted" : "text-primary-fg"} />
      </span>
      <span className="relative z-10 grid place-items-center">
        <Moon size={14} className={isDark ? "text-bg" : "text-muted"} />
      </span>
    </button>
  );
}
