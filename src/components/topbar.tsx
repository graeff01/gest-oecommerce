import { LogOut } from "lucide-react";
import { initials } from "@/lib/format";
import type { SessionUser } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { GlobalSearch } from "@/components/global-search";
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
    <header className="sticky top-2 z-10 flex flex-col gap-2 rounded-2xl border border-border bg-surface/88 p-2 shadow-soft backdrop-blur-xl sm:top-3 sm:flex-row sm:items-center sm:justify-between sm:pl-4">
      <div className="flex min-w-0 flex-1 items-center gap-3 self-stretch">
        <span className="hidden h-2 w-2 shrink-0 animate-pulse-soft rounded-full bg-success md:inline-block" />
        <p className="hidden min-w-0 truncate text-[0.82rem] font-medium text-muted lg:block">
          <span className="text-fg">{todayLabel()}</span>
          <span className="mx-2 hidden text-subtle md:inline">·</span>
          <span className="hidden md:inline">Operação ativa</span>
        </p>
        <div className="min-w-0 flex-1 lg:flex-none">
          <GlobalSearch />
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-start">
        <ThemeToggle compact />

        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-surface py-1 pl-1 pr-2 sm:flex-none sm:gap-3 sm:pr-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary-2 text-[0.78rem] font-bold text-primary-fg">
            {initials(user.name)}
          </span>
          <div className="min-w-0 leading-tight">
            <strong className="block truncate text-[0.83rem] font-semibold text-fg">{user.name}</strong>
            <span className="block truncate text-[0.7rem] font-medium text-muted">{roleLabel(user.role)}</span>
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
