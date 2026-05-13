import { connection } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Info,
  Package,
  ShoppingBag,
  Users,
  WifiOff,
  XCircle,
} from "lucide-react";
import { fetchAllClients, ClientSnapshot, Alert } from "@/lib/admin-clients";

const ADMIN_COOKIE = "gestao_admin_session";

function StatusDot({ online }: { online: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      {online && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${online ? "bg-success" : "bg-danger"}`} />
    </span>
  );
}

function AlertRow({ alert }: { alert: Alert }) {
  const cfg = {
    critical: { cls: "text-danger", icon: <XCircle size={12} className="shrink-0" /> },
    warning:  { cls: "text-warning", icon: <AlertTriangle size={12} className="shrink-0" /> },
    info:     { cls: "text-primary", icon: <Info size={12} className="shrink-0" /> },
  }[alert.level];

  return (
    <li className={`flex items-center gap-2 text-[0.78rem] font-medium ${cfg.cls}`}>
      {cfg.icon}
      {alert.message}
    </li>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-subtle">{label}</span>
      <strong className="font-display text-[1.05rem] font-semibold leading-none tracking-tight text-fg">{value}</strong>
      {sub && <span className="text-[0.68rem] text-muted">{sub}</span>}
    </div>
  );
}

function ClientCard({ client }: { client: ClientSnapshot }) {
  const criticalAlerts = client.alerts.filter((a) => a.level === "critical");
  const hasCritical = criticalAlerts.length > 0;

  if (!client.online) {
    return (
      <div className="flex items-start gap-4 rounded-2xl border border-border bg-surface-2/40 px-5 py-4 opacity-60">
        <StatusDot online={false} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-[0.95rem] font-semibold text-fg">{client.storeName}</p>
              <p className="text-[0.72rem] text-muted">{client.name}</p>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-danger-soft px-2.5 py-1 text-[0.72rem] font-semibold text-danger">
              <WifiOff size={11} /> Offline
            </span>
          </div>
          <p className="mt-2 text-[0.75rem] text-danger/80">{client.error}</p>
        </div>
      </div>
    );
  }

  const allClear = client.alerts.length === 0;

  return (
    <div className={`rounded-2xl border bg-surface-2/40 px-5 py-4 transition ${hasCritical ? "border-danger/30 bg-danger-soft/5" : "border-border"}`}>

      {/* linha 1 — nome + badge */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <StatusDot online={true} />
          <div>
            <p className="font-display text-[0.95rem] font-semibold leading-tight text-fg">{client.storeName}</p>
            <p className="text-[0.7rem] text-muted">{client.name}</p>
          </div>
        </div>

        {allClear ? (
          <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-success-soft px-2.5 py-1 text-[0.72rem] font-semibold text-success">
            <CheckCircle2 size={11} /> Tudo ok
          </span>
        ) : (
          <span className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[0.72rem] font-semibold ${hasCritical ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"}`}>
            <AlertTriangle size={11} />
            {client.alertCount} alerta{client.alertCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* linha 2 — alertas (compactos, sem caixas) */}
      {client.alerts.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5 border-t border-border/60 pt-3">
          {client.alerts.map((a, i) => <AlertRow key={i} alert={a} />)}
        </ul>
      )}

      {/* linha 3 — métricas em linha */}
      <div className="mt-4 flex flex-wrap items-start gap-x-7 gap-y-3 border-t border-border/60 pt-4">
        <Stat label="Última venda" value={client.lastSaleAgo ?? "Nunca"} />
        <Stat label="Vendas 7d" value={client.salesLast7} sub={`${client.salesLast30} em 30 dias`} />
        <Stat label="Usuários" value={`${client.activeUsers}/${client.totalUsers}`} sub="ativos / total" />
        <Stat
          label="Catálogo"
          value={client.totalProducts}
          sub={client.productsWithoutVariants > 0 ? `${client.productsWithoutVariants} incompleto${client.productsWithoutVariants > 1 ? "s" : ""}` : "produtos"}
        />
        <Stat label="Clientes" value={client.totalCustomers} sub={`+${client.newCustomersLast30} em 30 dias`} />
      </div>
    </div>
  );
}

export default async function AdminDashboard() {
  await connection();

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret || token !== adminSecret) {
    redirect("/admin/login");
  }

  const clients = await fetchAllClients();

  const totalAlerts = clients.reduce((s, c) => s + c.alertCount, 0);
  const criticalCount = clients.reduce((s, c) => s + c.alerts.filter((a) => a.level === "critical").length, 0);
  const onlineCount = clients.filter((c) => c.online).length;
  const totalSales7 = clients.reduce((s, c) => s + c.salesLast7, 0);

  const sorted = [...clients].sort((a, b) => {
    if (!a.online && b.online) return 1;
    if (a.online && !b.online) return -1;
    return b.alertCount - a.alertCount;
  });

  return (
    <div className="min-h-dvh bg-surface p-4 md:p-8">
      <div className="mx-auto max-w-3xl">

        {/* header */}
        <header className="mb-7 flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-widest text-subtle">Painel Master</p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-fg md:text-3xl">
              Central de <span className="text-gradient">monitoramento</span>
            </h1>
          </div>
          <form action="/api/admin/logout" method="POST">
            <button type="submit" className="mt-1 rounded-xl border border-border bg-surface-2 px-4 py-2 text-[0.82rem] text-muted transition hover:text-danger">
              Sair
            </button>
          </form>
        </header>

        {clients.length === 0 ? (
          <div className="grid place-items-center gap-4 rounded-2xl border border-dashed border-border bg-surface-2/30 p-16 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Building2 size={24} strokeWidth={2.1} />
            </span>
            <div>
              <p className="font-display text-lg font-semibold tracking-tight text-fg">Nenhum cliente configurado</p>
              <p className="mt-2 max-w-sm text-[0.86rem] text-muted">
                Configure <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-fg">ADMIN_CLIENTS</code> nas variáveis do Railway.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-5">

            {/* resumo — 4 pills compactos */}
            <div className="flex flex-wrap gap-2">
              <div className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[0.78rem] font-semibold ${onlineCount === clients.length ? "border-success/20 bg-success-soft text-success" : "border-danger/20 bg-danger-soft text-danger"}`}>
                <Activity size={13} />
                {onlineCount}/{clients.length} online
              </div>
              <div className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[0.78rem] font-semibold ${criticalCount > 0 ? "border-danger/20 bg-danger-soft text-danger" : totalAlerts > 0 ? "border-warning/20 bg-warning-soft text-warning" : "border-success/20 bg-success-soft text-success"}`}>
                {criticalCount > 0 ? <XCircle size={13} /> : totalAlerts > 0 ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
                {totalAlerts === 0 ? "Sem alertas" : `${totalAlerts} alerta${totalAlerts !== 1 ? "s" : ""}`}
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2/60 px-3.5 py-2 text-[0.78rem] font-semibold text-muted">
                <ShoppingBag size={13} />
                {totalSales7} venda{totalSales7 !== 1 ? "s" : ""} em 7 dias
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2/60 px-3.5 py-2 text-[0.78rem] font-semibold text-muted">
                <Users size={13} />
                {clients.reduce((s, c) => s + c.totalCustomers, 0)} clientes
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2/60 px-3.5 py-2 text-[0.78rem] font-semibold text-muted">
                <Package size={13} />
                {clients.reduce((s, c) => s + c.totalProducts, 0)} produtos
              </div>
            </div>

            {/* cards dos clientes */}
            <div className="grid gap-3">
              {sorted.map((client) => (
                <ClientCard key={client.key} client={client} />
              ))}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
