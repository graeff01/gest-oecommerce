"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Command as CommandIcon,
  ExternalLink,
  Search,
  Sparkles,
  X
} from "lucide-react";

export type CommandPaletteClient = {
  key: string;
  storeName: string;
  name: string;
  appUrl: string | null;
  health: number;
  online: boolean;
  alertCount: number;
};

type Action = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
  group: "Clientes" | "Acoes" | "Navegacao";
  searchText: string;
};

export function CommandPalette({ clients }: { clients: CommandPaletteClient[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Open with Ctrl+K / Cmd+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isShortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k";
      if (isShortcut) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const actions = useMemo<Action[]>(() => {
    const list: Action[] = [];

    clients.forEach((c) => {
      list.push({
        id: `view-${c.key}`,
        label: c.storeName,
        hint: `Saude ${c.health} - ${c.online ? "online" : "offline"}${c.alertCount ? ` - ${c.alertCount} alerta(s)` : ""}`,
        icon: <Building2 size={14} />,
        run: () => router.push(`/admin/client/${c.key}`),
        group: "Clientes",
        searchText: `${c.storeName} ${c.name} ${c.key}`.toLowerCase()
      });
      if (c.appUrl) {
        list.push({
          id: `open-${c.key}`,
          label: `Abrir app de ${c.storeName}`,
          hint: c.appUrl,
          icon: <ExternalLink size={14} />,
          run: () => window.open(c.appUrl!, "_blank", "noopener,noreferrer"),
          group: "Acoes",
          searchText: `abrir ${c.storeName} ${c.appUrl}`.toLowerCase()
        });
      }
    });

    const criticalClients = clients.filter((c) => c.alertCount > 0 || !c.online);
    if (criticalClients.length > 0) {
      list.push({
        id: "critical",
        label: `Ver ${criticalClients.length} cliente(s) com alertas`,
        hint: criticalClients
          .map((c) => c.storeName)
          .slice(0, 3)
          .join(", "),
        icon: <AlertTriangle size={14} />,
        run: () => {
          const first = criticalClients[0];
          router.push(`/admin/client/${first.key}`);
        },
        group: "Acoes",
        searchText: "alertas criticos"
      });
    }

    list.push({
      id: "dashboard",
      label: "Voltar para o dashboard",
      icon: <ArrowRight size={14} />,
      run: () => router.push("/admin"),
      group: "Navegacao",
      searchText: "dashboard inicio home"
    });

    return list;
  }, [clients, router]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return actions;
    return actions.filter((a) => a.searchText.includes(term));
  }, [actions, q]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  function runItem(idx: number) {
    const item = filtered[idx];
    if (!item) return;
    item.run();
    setOpen(false);
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runItem(active);
    }
  }

  // Group filtered actions
  const grouped = useMemo(() => {
    const groups: Record<string, Action[]> = {};
    filtered.forEach((a) => {
      if (!groups[a.group]) groups[a.group] = [];
      groups[a.group].push(a);
    });
    return groups;
  }, [filtered]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-[0.78rem] font-semibold text-white/70 transition hover:bg-white/10 hover:text-white md:inline-flex"
        title="Abrir command palette (Ctrl+K)"
      >
        <Search size={13} />
        <span>Buscar e agir</span>
        <span className="inline-flex items-center gap-0.5 rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[0.62rem] font-bold text-white/60">
          <CommandIcon size={9} />K
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] grid place-items-start overflow-y-auto bg-black/55 p-3 backdrop-blur-sm md:p-10"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative mx-auto mt-[8vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-elevated shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border bg-surface-2/40 px-4 py-3">
              <Sparkles size={16} className="text-primary" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Buscar cliente ou acao... (Esc para fechar)"
                className="flex-1 bg-transparent text-[0.92rem] font-medium text-fg outline-none placeholder:text-subtle"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-lg border border-border bg-surface text-muted hover:text-danger"
              >
                <X size={13} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="grid place-items-center p-8 text-center text-[0.84rem] text-muted">
                  Nenhum resultado para &quot;{q}&quot;
                </div>
              ) : (
                Object.entries(grouped).map(([group, items]) => (
                  <div key={group} className="mb-2">
                    <p className="px-2 py-1 text-[0.6rem] font-bold uppercase tracking-widest text-subtle">{group}</p>
                    {items.map((item) => {
                      const idx = filtered.indexOf(item);
                      const isActive = idx === active;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onMouseEnter={() => setActive(idx)}
                          onClick={() => runItem(idx)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                            isActive ? "bg-primary-soft text-primary" : "text-fg hover:bg-surface-2/60"
                          }`}
                        >
                          <span
                            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                              isActive ? "bg-primary text-white" : "bg-surface-2 text-muted"
                            }`}
                          >
                            {item.icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[0.84rem] font-semibold">{item.label}</p>
                            {item.hint && (
                              <p className="truncate text-[0.7rem] text-muted">{item.hint}</p>
                            )}
                          </div>
                          {isActive && <ArrowRight size={12} className="shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border bg-surface-2/30 px-4 py-2 text-[0.66rem] text-muted">
              <span className="inline-flex items-center gap-2">
                <kbd className="kbd">↑</kbd>
                <kbd className="kbd">↓</kbd>
                navegar
              </span>
              <span className="inline-flex items-center gap-2">
                <kbd className="kbd">Enter</kbd>
                executar
              </span>
              <span className="inline-flex items-center gap-2">
                <kbd className="kbd">Esc</kbd>
                fechar
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
