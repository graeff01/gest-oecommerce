import { LogOut } from "lucide-react";
import { initials } from "@/lib/format";
import type { SessionUser } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { logoutAction } from "@/app/(auth)/login/actions";

function roleLabel(role: string) {
  const map: Record<string, string> = {
    ADMIN: "Administrador",
    FINANCE: "Financeiro",
    STOCK: "Estoque",
    SALES: "Vendas"
  };
  return map[role] ?? role;
}

function todayLabel() {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  });
  const text = formatter.format(new Date());
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function Topbar({ user }: { user: SessionUser }) {
  return (
    <header className="sticky top-3 z-10 flex flex-col gap-3 rounded-2xl border border-border bg-surface/80 p-2 pl-4 shadow-soft backdrop-blur-xl md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <span className="hidden h-2 w-2 animate-pulse-soft rounded-full bg-success md:inline-block" />
        <p className="text-[0.82rem] font-medium text-muted">
          <span className="text-fg">{todayLabel()}</span>
          <span className="mx-2 text-subtle">·</span>
          Operação ativa
        </p>
      </div>

      <div className="flex items-center justify-end gap-2">
        <ThemeToggle compact />

        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface py-1 pl-1 pr-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary-2 text-[0.78rem] font-bold text-primary-fg">
            {initials(user.name)}
          </span>
          <div className="leading-tight">
            <strong className="block text-[0.83rem] font-semibold text-fg">{user.name}</strong>
            <span className="block text-[0.7rem] font-medium text-muted">{roleLabel(user.role)}</span>
          </div>
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            title="Sair"
            className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface text-muted transition hover:border-danger/40 hover:bg-danger-soft hover:text-danger"
          >
            <LogOut size={16} strokeWidth={2.1} />
          </button>
        </form>
      </div>
    </header>
  );
}
