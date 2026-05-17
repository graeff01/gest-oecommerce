"use client";

import { useState } from "react";
import { CheckSquare, Square, Trash2, Calendar, Flag, Plus } from "lucide-react";
import { createTaskAction, deleteTaskAction, toggleTaskAction } from "@/app/(admin)/admin/actions";

export type AdminTaskDTO = {
  id: string;
  title: string;
  done: boolean;
  priority: number;
  dueDate: string | null;
};

function fmtDue(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(d);
}

function isOverdue(iso: string | null) {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

const PRIORITY_LABEL: Record<number, { label: string; color: string }> = {
  0: { label: "normal", color: "text-muted" },
  1: { label: "baixa", color: "text-sky-600" },
  2: { label: "media", color: "text-warning" },
  3: { label: "alta", color: "text-danger" }
};

export function TaskList({ clientId, tasks }: { clientId: string; tasks: AdminTaskDTO[] }) {
  const [draft, setDraft] = useState("");
  const [priority, setPriority] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setPending(true);
    const fd = new FormData();
    fd.set("clientId", clientId);
    fd.set("title", draft.trim());
    fd.set("priority", String(priority));
    if (dueDate) fd.set("dueDate", new Date(dueDate).toISOString());
    try {
      await createTaskAction(fd);
      setDraft("");
      setDueDate("");
      setPriority(0);
    } finally {
      setPending(false);
    }
  }

  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-bold tracking-tight text-fg">Tarefas e lembretes</h3>
          <p className="text-[0.72rem] text-muted">
            {open.length} aberta{open.length !== 1 ? "s" : ""}
            {done.length > 0 ? ` - ${done.length} concluida${done.length !== 1 ? "s" : ""}` : ""}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mb-3 grid gap-2 rounded-xl border border-border bg-surface-2/30 p-2.5 md:grid-cols-[1fr_auto_auto_auto]">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Nova tarefa... (ex: ligar 3a feira)"
          className="h-9 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-fg outline-none transition focus:border-primary"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
          className="h-9 rounded-lg border border-border bg-surface px-2 text-xs font-semibold text-fg outline-none"
          title="Prioridade"
        >
          <option value={0}>Normal</option>
          <option value={1}>Baixa</option>
          <option value={2}>Media</option>
          <option value={3}>Alta</option>
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="h-9 rounded-lg border border-border bg-surface px-2 text-xs font-medium text-fg outline-none"
          title="Prazo"
        />
        <button
          type="submit"
          disabled={pending || !draft.trim()}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          <Plus size={12} /> Add
        </button>
      </form>

      {open.length === 0 && done.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface-2/30 p-4 text-center text-[0.78rem] text-muted">
          Sem tarefas. Comece criando lembretes que voce nao quer esquecer.
        </div>
      )}

      <ul className="grid gap-1.5">
        {open.map((t) => {
          const overdue = isOverdue(t.dueDate);
          const due = fmtDue(t.dueDate);
          const pri = PRIORITY_LABEL[t.priority] ?? PRIORITY_LABEL[0];
          return (
            <li
              key={t.id}
              className={`group flex items-center gap-2 rounded-xl border bg-surface-2/30 p-2.5 transition hover:bg-surface-2/50 ${
                overdue ? "border-danger/30" : "border-border"
              }`}
            >
              <form action={toggleTaskAction}>
                <input type="hidden" name="id" value={t.id} />
                <button
                  type="submit"
                  className="grid h-6 w-6 place-items-center rounded-md text-muted transition hover:text-success"
                  title="Marcar como concluida"
                >
                  <Square size={14} />
                </button>
              </form>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.82rem] font-semibold text-fg">{t.title}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[0.66rem] text-muted">
                  {due && (
                    <span className={`inline-flex items-center gap-1 ${overdue ? "font-bold text-danger" : ""}`}>
                      <Calendar size={9} />
                      {due}
                      {overdue && " (atrasada)"}
                    </span>
                  )}
                  {t.priority > 0 && (
                    <span className={`inline-flex items-center gap-1 font-bold ${pri.color}`}>
                      <Flag size={9} /> {pri.label}
                    </span>
                  )}
                </div>
              </div>
              <form action={deleteTaskAction}>
                <input type="hidden" name="id" value={t.id} />
                <button
                  type="submit"
                  className="grid h-7 w-7 place-items-center rounded-md text-muted opacity-0 transition hover:text-danger group-hover:opacity-100"
                  title="Remover"
                >
                  <Trash2 size={12} />
                </button>
              </form>
            </li>
          );
        })}

        {done.length > 0 && (
          <>
            <li className="mt-2 px-1 text-[0.6rem] font-bold uppercase tracking-widest text-subtle">
              Concluidas
            </li>
            {done.slice(0, 10).map((t) => (
              <li key={t.id} className="group flex items-center gap-2 rounded-xl border border-border/40 bg-surface-2/15 p-2.5 opacity-70">
                <form action={toggleTaskAction}>
                  <input type="hidden" name="id" value={t.id} />
                  <button
                    type="submit"
                    className="grid h-6 w-6 place-items-center rounded-md text-success transition"
                    title="Marcar como aberta"
                  >
                    <CheckSquare size={14} />
                  </button>
                </form>
                <p className="min-w-0 flex-1 truncate text-[0.8rem] font-medium text-muted line-through">
                  {t.title}
                </p>
                <form action={deleteTaskAction}>
                  <input type="hidden" name="id" value={t.id} />
                  <button
                    type="submit"
                    className="grid h-7 w-7 place-items-center rounded-md text-muted opacity-0 transition hover:text-danger group-hover:opacity-100"
                    title="Remover"
                  >
                    <Trash2 size={12} />
                  </button>
                </form>
              </li>
            ))}
          </>
        )}
      </ul>
    </div>
  );
}
