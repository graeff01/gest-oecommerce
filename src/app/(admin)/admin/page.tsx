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
  RefreshCw,
  ShoppingBag,
  Users,
  WifiOff,
  XCircle,
} from "lucide-react";
import { fetchAllClients, ClientSnapshot, Alert } from "@/lib/admin-clients";

const ADMIN_COOKIE = "gestao_admin_session";

function StatusDot({ online }: { online: boolean }) {
  return (
    <span className={`inline-block h-2.5 w-2.5 rounded-full ${online ? "bg-success shadow-[0_0_6px_2px_rgba(34,197,94,0.4)]" : "bg-danger"}`} />
  );
}

function AlertBadge({ alert }: { alert: Alert }) {
  const styles = {
    critical: "bg-danger-soft text-danger border-danger/20",
    warning: "bg-warning-soft text-warning border-warning/20",
    info: "bg-primary-soft text-primary border-primary/20",
  };
  const icons = {
    critical: <XCircle size={13} className="shrink-0" />,
    warning: <AlertTriangle size={13} className="shrink-0" />,
    info: <Info size={13} className="shrink-0" />,
  };

  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[0.78rem] font-medium ${styles[alert.level]}`}>
      {icons[alert.level]}
      {alert.message}
    </div>
  );
}

function ClientCard({ client }: { client: ClientSnapshot }) {
  if (!client.online) {
    return (
      <div className="surface-card grid gap-4 p-5 opacity-60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusDot online={false} />
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight text-fg">{client.storeName}</h2>
              <p className="text-[0.74rem] text-muted">{client.name}</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-xl bg-danger-soft px-3 py-1.5 text-[0.76rem] font-semibold text-danger">
            <WifiOff size={13} /> Offline
          </span>
        </div>
        <p className="rounded-xl bg-danger-soft/60 p-3 text-[0.78rem] text-danger">{client.error}</p>
      </div>
    );
  }

  const criticalAlerts = client.alerts.filter((a) => a.level === "critical");
  const warningAlerts = client.alerts.filter((a) => a.level === "warning");
  const infoAlerts = client.alerts.filter((a) => a.level === "info");
  const allClear = client.alerts.length === 0;

  return (
    <div className={`surface-card grid gap-5 p-5 ${criticalAlerts.length > 0 ? "ring-1 ring-danger/30" : ""}`}>

      {/* cabeçalho */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <StatusDot online={true} />
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight text-fg">{client.storeName}</h2>
            <p className="text-[0.74rem] text-muted">{client.name}</p>
          </div>
        </div>
        {allClear ? (
          <span className="flex items-center gap-1.5 rounded-xl bg-success-soft px-3 py-1.5 text-[0.76rem] font-semibold text-success">
            <CheckCircle2 size={13} /> Tudo ok
          </span>
        ) : (
          <span className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[0.76rem] font-semibold ${criticalAlerts.length > 0 ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"}`}>
            <AlertTriangle size={13} />
            {client.alertCount} alerta{client.alertCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* alertas */}
      {client.alerts.length > 0 && (
        <div className="grid gap-2">
          {criticalAlerts.map((a, i) => <AlertBadge key={i} alert={a} />)}
          {warningAlerts.map((a, i) => <AlertBadge key={i} alert={a} />)}
          {infoAlerts.map((a, i) => <AlertBadge key={i} alert={a} />)}
        </div>
      )}

      {/* métricas de engajamento */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface-2/40 p-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-soft text-primary">
              <Activity size={15} strokeWidth={2.1} />
            </span>
            <p className="text-[0.68rem] font-medium uppercase tracking-wide text-subtle">Última venda</p>
          </div>
          <strong className="mt-3 block font-display text-base font-semibold tracking-tight text-fg">
            {client.lastSaleAgo ?? "Nunca"}
          </strong>
        </div>

        <div className="rounded-2xl border border-border bg-surface-2/40 p-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-success-soft text-success">
              <ShoppingBag size={15} strokeWidth={2.1} />
            </span>
            <p className="text-[0.68rem] font-medium uppercase tracking-wide text-subtle">Vendas 7d</p>
          </div>
          <strong className="mt-3 block font-display text-base font-semibold tracking-tight text-fg">
            {client.salesLast7}
          </strong>
          <p className="mt-0.5 text-[0.7rem] text-muted">{client.salesLast30} em 30 dias</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-2/40 p-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-warning-soft text-warning">
              <Users size={15} strokeWidth={2.1} />
            </span>
            <p className="text-[0.68rem] font-medium uppercase tracking-wide text-subtle">Usuários</p>
          </div>
          <strong className="mt-3 block font-display text-base font-semibold tracking-tight text-fg">
            {client.activeUsers}/{client.totalUsers}
          </strong>
          <p className="mt-0.5 text-[0.7rem] text-muted">ativos / total</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-2/40 p-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-soft text-primary">
              <Package size={15} strokeWidth={2.1} />
            </span>
            <p className="text-[0.68rem] font-medium uppercase tracking-wide text-subtle">Catálogo</p>
          </div>
          <strong className="mt-3 block font-display text-base font-semibold tracking-tight text-fg">
            {client.totalProducts}
          </strong>
          <p className="mt-0.5 text-[0.7rem] text-muted">produtos</p>
        </div>
      </div>

      {/* crescimento */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <span className="text-[0.74rem] font-medium text-muted">Crescimento:</span>
        <span className="chip">
          +{client.newCustomersLast30} cliente{client.newCustomersLast30 !== 1 ? "s" : ""} em 30 dias
        </span>
        <span className="chip">
          {client.totalCustomers} cliente{client.totalCustomers !== 1 ? "s" : ""} no total
        </span>
        {client.productsWithoutVariants > 0 && (
          <span className="chip text-warning">
            {client.productsWithoutVariants} produto{client.productsWithoutVariants > 1 ? "s" : ""} incompleto{client.productsWithoutVariants > 1 ? "s" : ""}
          </span>
        )}
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

  return (
    <div className="min-h-dvh bg-surface p-4 md:p-8">
      <div className="mx-auto max-w-5xl">

        {/* header */}
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="eyebrow">Painel Master</p>
            <h1 className="heading-display mt-1 text-2xl md:text-3xl">
              Central de <span className="text-gradient">monitoramento</span>
            </h1>
            <p className="mt-1 text-[0.85rem] text-muted">Saúde, engajamento e alertas de todos os clientes.</p>
          </div>
          <div className="flex items-center gap-3">
            <form action="/api/admin/logout" method="POST">
              <button type="submit" className="rounded-xl border border-border bg-surface-2 px-4 py-2 text-sm text-muted transition hover:text-danger">
                Sair
              </button>
            </form>
          </div>
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
          <div className="grid gap-6">

            {/* resumo geral */}
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="surface-card flex items-center gap-4 p-4">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${onlineCount === clients.length ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
                  <Activity size={18} strokeWidth={2.1} />
                </span>
                <div>
                  <p className="text-[0.7rem] font-medium uppercase tracking-wide text-subtle">Clientes online</p>
                  <strong className="mt-0.5 block font-display text-xl font-semibold tracking-tight text-fg">
                    {onlineCount}/{clients.length}
                  </strong>
                </div>
              </div>

              <div className="surface-card flex items-center gap-4 p-4">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${criticalCount > 0 ? "bg-danger-soft text-danger" : totalAlerts > 0 ? "bg-warning-soft text-warning" : "bg-success-soft text-success"}`}>
                  {criticalCount > 0 ? <XCircle size={18} /> : totalAlerts > 0 ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                </span>
                <div>
                  <p className="text-[0.7rem] font-medium uppercase tracking-wide text-subtle">Alertas ativos</p>
                  <strong className="mt-0.5 block font-display text-xl font-semibold tracking-tight text-fg">
                    {totalAlerts === 0 ? "Nenhum" : totalAlerts}
                  </strong>
                  {criticalCount > 0 && <p className="text-[0.7rem] text-danger">{criticalCount} crítico{criticalCount > 1 ? "s" : ""}</p>}
                </div>
              </div>

              <div className="surface-card flex items-center gap-4 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <ShoppingBag size={18} strokeWidth={2.1} />
                </span>
                <div>
                  <p className="text-[0.7rem] font-medium uppercase tracking-wide text-subtle">Vendas (7 dias)</p>
                  <strong className="mt-0.5 block font-display text-xl font-semibold tracking-tight text-fg">
                    {totalSales7}
                  </strong>
                  <p className="text-[0.7rem] text-muted">todos os clientes</p>
                </div>
              </div>

              <div className="surface-card flex items-center gap-4 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning">
                  <RefreshCw size={18} strokeWidth={2.1} />
                </span>
                <div>
                  <p className="text-[0.7rem] font-medium uppercase tracking-wide text-subtle">Atualizado</p>
                  <strong className="mt-0.5 block font-display text-base font-semibold tracking-tight text-fg">
                    agora
                  </strong>
                  <p className="text-[0.7rem] text-muted">dados em tempo real</p>
                </div>
              </div>
            </section>

            {/* cards dos clientes — críticos primeiro */}
            <div className="grid gap-4">
              {[...clients]
                .sort((a, b) => {
                  if (!a.online) return 1;
                  if (!b.online) return -1;
                  return b.alertCount - a.alertCount;
                })
                .map((client) => (
                  <ClientCard key={client.key} client={client} />
                ))}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
