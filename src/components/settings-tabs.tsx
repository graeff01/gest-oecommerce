"use client";

import { motion } from "framer-motion";
import { useState, type ReactNode } from "react";

type Tab = {
  id: string;
  label: string;
  icon: ReactNode;
  content: ReactNode;
};

export function SettingsTabs({ tabs, defaultTab }: { tabs: Tab[]; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];

  return (
    <div className="grid gap-5">
      <div className="surface-card flex flex-wrap gap-1 p-1.5">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[0.86rem] font-medium transition ${
                isActive ? "text-fg" : "text-muted hover:text-fg"
              }`}
            >
              {isActive ? (
                <motion.span
                  layoutId="settings-tab-bg"
                  transition={{ type: "spring", stiffness: 460, damping: 32 }}
                  className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary-soft to-primary-soft/60 ring-1 ring-primary/25"
                />
              ) : null}
              <span className={`relative z-10 inline-flex ${isActive ? "text-primary" : ""}`}>{tab.icon}</span>
              <span className={`relative z-10 ${isActive ? "font-semibold text-fg" : ""}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <motion.div
        key={current.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 0.9, 0.32, 1] }}
      >
        {current.content}
      </motion.div>
    </div>
  );
}
