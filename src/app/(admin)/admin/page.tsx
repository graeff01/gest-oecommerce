import { connection } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Cpu,
  Database,
  ExternalLink,
  Info,
  LogOut,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  TrendingUp,
  Users,
  XCircle
} from "lucide-react";
import { AdminClientPlan, AdminClientStatus } from "@prisma/client";
import { fetchAllClients, ClientSnapshot, Alert } from "@/lib/admin-clients";
import { prisma } from "@/lib/prisma";
import { AdminFormDialog } from "@/components/admin-form-dialog";
import {
  createAdminClientAction,
  deleteAdminClientAction,
  setAdminClientStatusAction,
  updateAdminClientAction
} from "./actions";

const ADMIN_COOKIE = "gestao_admin_session";

const STATUS_LABEL: Record<AdminClientStatus, string> = {
  SETUP: "Implantacao",
  TRIAL: "Teste",
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
  CANCELED: "Cancelado"
};

const PLAN_LABEL: Record<AdminClientPlan, string> = {
  STARTER: "Starter",
  PRO: "Pro",
  BUSINESS: "Business",
  ENTERPRISE: "Enterprise"
};

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function StatusDot({ online }: { online: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      {online && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${online ? "bg-success" : "bg-danger"}`} />
    </span>
  );
}

function AlertRow({ alert }: { alert: Alert }) {
  const cfg = {
    critical: { cls: "text-danger", icon: <XCircle size={11} className="mt-0.5 shrink-0" /> },
    warning: { cls: "text-warning", icon: <AlertTriangle size={11} className="mt-0.5 shrink-0" /> },
    info: { cls: "text-primary", icon: <Info size={11} className="mt-0.5 shrink-0" /> }
  }[alert.level];

  return (
    <li className={`flex items-start gap-2 text-[0.73rem] font-medium leading-snug ${cfg.cls}`}>
      {cfg.icon}
      <span>{alert.message}</span>
    </li>
  );
}

function MiniBar({ value, max, colorClass }: { value: number; max: number; colorClass: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-3/50">
      <div className={`h-full rounded-full transition-all duration-700 ${colorClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  barValue,
  barMax,
  barColor
}: {
  label: string;
  value: string | number;
  sub?: string;
  barValue?: number;
  barMax?: number;
  barColor?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border/60 bg-surface-2/30 px-3 py-2.5">
      <span className="text-[0.58rem] font-bold uppercase tracking-widest text-subtle">{label}</span>
      <strong className="mt-1 block truncate font-display text-sm font-bold leading-tight tracking-tight text-fg">
        {value}
      </strong>
      {sub && <span className="mt-0.5 block truncate text-[0.63rem] text-muted">{sub}</span>}
      {barValue !== undefined && barMax !== undefined && barMax > 0 && (
        <MiniBar value={barValue} max={barMax} colorClass={barColor ?? "bg-primary"} />
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
  tone = "neutral",
  sub,
  progress
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "primary";
  sub?: string;
  progress?: { value: number; max: number };
}) {
  const toneMap = {
    neutral: {
      card: "border-border bg-surface",
      icon: "bg-surface-2 text-subtle",
      bar: "bg-muted/40"
    },
    success: {
      card: "border-success/25 bg-success-soft/40",
      icon: "bg-success/12 text-success",
      bar: "bg-success"
    },
    warning: {
      card: "border-warning/25 bg-warning-soft/40",
      icon: "bg-warning/12 text-warning",
      bar: "bg-warning"
    },
    danger: {
      card: "border-danger/25 bg-danger-soft/40",
      icon: "bg-danger/12 text-danger",
      bar: "bg-danger"
    },
    primary: {
      card: "border-primary/25 bg-primary-soft/40",
      icon: "bg-primary/10 text-primary",
      bar: "bg-primary"
    }
  }[tone];

  const pct = progress
    ? Math.min(100, progress.max > 0 ? Math.round((progress.value / progress.max) * 100) : 0)
    : null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-md ${toneMap.card}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${toneMap.icon}`}>
          {icon}
        </span>
        <div className="min-w-0 text-right">
          <strong className="block font-display text-2xl font-bold tracking-tight text-fg">{value}</strong>
          {sub && <p className="mt-0.5 truncate text-[0.67rem] font-medium text-muted">{sub}</p>}
        </div>
      </div>
      <p className="mt-3 truncate text-[0.62rem] font-bold uppercase tracking-widest text-muted">{label}</p>
      {pct !== null && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-3/60">
          <div
            className={`h-full rounded-full transition-all duration-700 ${toneMap.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function InsightCard({
  title,
  value,
  sub,
  icon,
  tone = "primary"
}: {
  title: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  tone?: "primary" | "success" | "warning" | "danger";
}) {
  const toneMap = {
    primary: "border-primary/20 bg-primary-soft/50 text-primary",
    success: "border-success/20 bg-success-soft/50 text-success",
    warning: "border-warning/20 bg-warning-soft/50 text-warning",
    danger: "border-danger/20 bg-danger-soft/50 text-danger"
  }[tone];

  return (
    <div className={`rounded-2xl border p-3 transition hover:-translate-y-0.5 ${toneMap}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface/70">{icon}</span>
        <strong className="font-display text-2xl font-bold text-fg">{value}</strong>
      </div>
      <p className="mt-2 truncate text-[0.6rem] font-bold uppercase tracking-widest">{title}</p>
      <p className="mt-0.5 text-[0.68rem] font-medium leading-snug opacity-85">{sub}</p>
    </div>
  );
}

function ClientForm({
  action,
  client
}: {
  action: (formData: FormData) => Promise<void>;
  client?: {
    id: string;
    key: string;
    name: string;
    storeName: string | null;
    appUrl: string | null;
    databaseUrl: string;
    status: AdminClientStatus;
    plan: AdminClientPlan;
    monthlyFee: unknown;
    renewalDay: number | null;
    notes: string | null;
  };
}) {
  return (
    <form action={action} className="grid gap-3">
      {client && <input type="hidden" name="id" value={client.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="label">
          Chave
          <input className="field" name="key" defaultValue={client?.key ?? ""} placeholder="sonho-algodao" required />
        </label>
        <label className="label">
          Nome interno
          <input className="field" name="name" defaultValue={client?.name ?? ""} placeholder="Sonho de Algodao" required />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="label">
          Nome da loja
          <input className="field" name="storeName" defaultValue={client?.storeName ?? ""} placeholder="Nome exibido" />
        </label>
        <label className="label">
          URL do sistema
          <input
            className="field"
            name="appUrl"
            defaultValue={client?.appUrl ?? ""}
            placeholder="https://cliente.up.railway.app"
          />
        </label>
      </div>
      <label className="label">
        DATABASE_URL do cliente
        <textarea
          className="field min-h-20 font-mono text-xs"
          name="databaseUrl"
          defaultValue={client?.databaseUrl ?? ""}
          required
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="label">
          Status
          <select className="field" name="status" defaultValue={client?.status ?? "TRIAL"}>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="label">
          Plano
          <select className="field" name="plan" defaultValue={client?.plan ?? "STARTER"}>
            {Object.entries(PLAN_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="label">
          Mensalidade
          <input
            className="field"
            name="monthlyFee"
            type="number"
            min="0"
            step="0.01"
            defaultValue={
              client?.monthlyFee === null || client?.monthlyFee === undefined ? "" : String(client.monthlyFee)
            }
          />
        </label>
        <label className="label">
          Dia de renovacao
          <input
            className="field"
            name="renewalDay"
            type="number"
            min="1"
            max="31"
            defaultValue={client?.renewalDay ?? ""}
          />
        </label>
      </div>
      <label className="label">
        Observacoes internas
        <textarea className="field min-h-20" name="notes" defaultValue={client?.notes ?? ""} />
      </label>
      <button className="button-primary">{client ? "Salvar cliente" : "Cadastrar cliente"}</button>
    </form>
  );
}

function ClientCard({
  client,
  dbClient,
  mrr
}: {
  client: ClientSnapshot;
  dbClient?: Awaited<ReturnType<typeof prisma.adminClient.findMany>>[number];
  mrr: number;
}) {
  const criticalAlerts = client.alerts.filter((a) => a.level === "critical");
  const hasCritical = criticalAlerts.length > 0 || !client.online || client.status === "SUSPENDED";
  const isHealthy = client.online && criticalAlerts.length === 0 && client.status === "ACTIVE";

  const stripeColor = hasCritical ? "bg-danger" : isHealthy ? "bg-success" : "bg-warning";
  const cardBorder = hasCritical ? "border-danger/30" : "border-border";
  const cardBg = hasCritical ? "bg-danger-soft/5" : "bg-surface";

  const mrrPct = mrr > 0 && client.monthlyFee ? Math.round((client.monthlyFee / mrr) * 100) : 0;

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border shadow-soft transition hover:-translate-y-0.5 hover:shadow-md ${cardBorder} ${cardBg}`}
    >
      {/* Health stripe */}
      <div className={`absolute left-0 top-0 h-full w-1 ${stripeColor}`} />

      <div className="flex flex-col gap-3 p-4 pl-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <StatusDot online={client.online} />
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold leading-tight text-fg">{client.storeName}</p>
              <p className="truncate text-[0.71rem] text-muted">
                {client.name} &middot; {client.key}
              </p>
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span
              className={`status-pill ${
                client.status === "ACTIVE"
                  ? ""
                  : client.status === "SUSPENDED" || client.status === "CANCELED"
                    ? "pill-danger"
                    : "pill-warning"
              }`}
            >
              {STATUS_LABEL[client.status]}
            </span>
            <span className="status-pill pill-primary">{PLAN_LABEL[client.plan]}</span>
            {client.monthlyFee ? <span className="chip">{money(client.monthlyFee)}/mes</span> : null}
            {client.source !== "database" && <span className="chip pill-warning">env</span>}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-1.5 lg:justify-end">
          {client.appUrl ? (
            <a
              href={client.appUrl}
              target="_blank"
              rel="noreferrer"
              className="button-secondary h-8 gap-1.5 px-3 py-0 text-xs"
            >
              <ExternalLink size={12} /> Abrir
            </a>
          ) : null}
          {dbClient ? (
            <AdminFormDialog
              label="Editar"
              title={`Editar ${client.storeName}`}
              description="Atualize plano, status, mensalidade e conexao."
              icon="pencil"
              tone="secondary"
            >
              <ClientForm action={updateAdminClientAction} client={dbClient} />
            </AdminFormDialog>
          ) : null}
        </div>
      </div>

      {!client.online && (
        <div className="mx-4 mb-3 ml-5 rounded-xl border border-danger/20 bg-danger-soft/60 px-3 py-2 text-[0.75rem] font-medium text-danger">
          {client.error ?? "Cliente offline ou banco inacessivel."}
        </div>
      )}

      {client.alerts.length > 0 ? (
        <ul className="mx-4 mb-0 ml-5 mt-0 grid gap-1.5 border-t border-border/50 pt-3 pb-3">
          {client.alerts.slice(0, 3).map((a, i) => (
            <AlertRow key={i} alert={a} />
          ))}
          {client.alerts.length > 3 ? (
            <li className="text-[0.7rem] font-semibold text-muted">+{client.alerts.length - 3} alerta(s)</li>
          ) : null}
        </ul>
      ) : client.online ? (
        <div className="mx-4 ml-5 mt-0 flex items-center gap-1.5 border-t border-border/50 pt-3 pb-3 text-[0.74rem] font-semibold text-success">
          <CheckCircle2 size={12} /> Operacao sem alertas
        </div>
      ) : null}

      <div className="mx-4 ml-5 mt-0 grid gap-2 border-t border-border/50 pt-3 pb-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Ultima venda" value={client.lastSaleAgo ?? "Nunca"} />
        <Stat
          label="Vendas 7d"
          value={client.salesLast7}
          sub={`${client.salesLast30} em 30d`}
          barValue={client.salesLast7}
          barMax={Math.max(client.salesLast30, 1)}
          barColor={client.salesLast7 > 0 ? "bg-success" : "bg-danger/50"}
        />
        <Stat
          label="Usuarios"
          value={`${client.activeUsers}/${client.totalUsers}`}
          sub="ativos"
          barValue={client.activeUsers}
          barMax={Math.max(client.totalUsers, 1)}
          barColor="bg-primary"
        />
        <Stat
          label="Catalogo"
          value={client.totalProducts}
          sub={client.productsWithoutVariants ? `${client.productsWithoutVariants} incompletos` : "ok"}
          barValue={client.totalProducts - client.productsWithoutVariants}
          barMax={Math.max(client.totalProducts, 1)}
          barColor="bg-accent"
        />
        <Stat
          label="Clientes"
          value={client.totalCustomers}
          sub={`+${client.newCustomersLast30} em 30d`}
        />
      </div>

      {mrr > 0 && client.monthlyFee ? (
        <div className="mx-4 ml-5 flex items-center gap-3 border-t border-border/50 pt-3 pb-3">
          <span className="shrink-0 text-[0.62rem] font-bold uppercase tracking-widest text-subtle">
            {mrrPct}% do MRR
          </span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3/50">
            <div
              className="h-full rounded-full bg-accent transition-all duration-700"
              style={{ width: `${mrrPct}%` }}
            />
          </div>
        </div>
      ) : null}

      {dbClient ? (
        <div className="mx-4 ml-5 flex flex-wrap gap-1.5 border-t border-border/50 pt-3 pb-4">
          {(["ACTIVE", "SUSPENDED", "CANCELED"] as AdminClientStatus[]).map((s) => (
            <form key={s} action={setAdminClientStatusAction}>
              <input type="hidden" name="id" value={dbClient.id} />
              <input type="hidden" name="status" value={s} />
              <button className="button-secondary h-7 px-2.5 py-0 text-[0.7rem]">{STATUS_LABEL[s]}</button>
            </form>
          ))}
          <form action={deleteAdminClientAction}>
            <input type="hidden" name="id" value={dbClient.id} />
            <button className="inline-flex h-7 items-center gap-1 rounded-xl border border-danger/25 bg-danger-soft/60 px-2.5 text-[0.7rem] font-semibold text-danger">
              <Trash2 size={11} /> Remover
            </button>
          </form>
        </div>
      ) : null}
    </article>
  );
}

export default async function AdminDashboard({
  searchParams
}: {
  searchParams: Promise<{ q?: string; status?: string; plan?: string }>;
}) {
  await connection();

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret || token !== adminSecret) {
    redirect("/admin/login");
  }

  const [{ q, status, plan }, clients, dbClients] = await Promise.all([
    searchParams,
    fetchAllClients(),
    prisma.adminClient.findMany({ orderBy: [{ status: "asc" }, { name: "asc" }] }).catch(() => [])
  ]);

  const dbByKey = new Map(dbClients.map((c) => [c.key, c]));
  const normalizedQuery = q?.trim().toLowerCase() ?? "";
  const filtered = clients.filter((c) => {
    const matchesQuery =
      !normalizedQuery || [c.name, c.storeName, c.key].join(" ").toLowerCase().includes(normalizedQuery);
    const matchesStatus = !status || status === "ALL" || c.status === status;
    const matchesPlan = !plan || plan === "ALL" || c.plan === plan;
    return matchesQuery && matchesStatus && matchesPlan;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!a.online && b.online) return -1;
    if (a.online && !b.online) return 1;
    return b.alertCount - a.alertCount;
  });

  const onlineCount = clients.filter((c) => c.online).length;
  const totalAlerts = clients.reduce((sum, c) => sum + c.alertCount, 0);
  const criticalCount = clients.reduce(
    (sum, c) => sum + c.alerts.filter((a) => a.level === "critical").length,
    0
  );
  const totalSales7 = clients.reduce((sum, c) => sum + c.salesLast7, 0);
  const totalSales30 = clients.reduce((sum, c) => sum + c.salesLast30, 0);
  const newCustomers30 = clients.reduce((sum, c) => sum + c.newCustomersLast30, 0);
  const mrr = dbClients.reduce((sum, c) => sum + Number(c.monthlyFee ?? 0), 0);
  const activeClients = clients.filter((c) => c.status === "ACTIVE").length;
  const payingClients = dbClients.filter((c) => Number(c.monthlyFee ?? 0) > 0).length;
  const arpu = payingClients ? mrr / payingClients : 0;
  const atRisk = clients.filter(
    (c) =>
      !c.online ||
      c.alerts.some((a) => a.level === "critical") ||
      c.status === "SUSPENDED" ||
      c.salesLast30 === 0
  ).length;
  const healthScore = clients.length
    ? Math.max(
        0,
        Math.round(((onlineCount / clients.length) * 70) + (((clients.length - atRisk) / clients.length) * 30))
      )
    : 100;
  const renewals = dbClients
    .filter((c) => c.renewalDay)
    .sort((a, b) => Number(a.renewalDay ?? 99) - Number(b.renewalDay ?? 99))
    .slice(0, 5);
  const priorityAlerts = clients
    .flatMap((c) => c.alerts.map((alert) => ({ client: c, alert })))
    .filter(({ alert }) => alert.level === "critical" || alert.level === "warning")
    .slice(0, 6);

  const systemOk = criticalCount === 0 && (clients.length === 0 || onlineCount === clients.length);

  return (
    <div className="h-full overflow-hidden bg-surface p-3 md:p-4">
      <div className="mx-auto grid h-full max-w-7xl grid-rows-[auto_auto_minmax(0,1fr)] gap-3 overflow-hidden">

        {/* ── COMMAND CENTER HEADER ──────────────────────────────── */}
        <header
          className="relative overflow-hidden rounded-2xl border border-indigo-900/40 shadow-xl"
          style={{
            background: "linear-gradient(135deg, #0d0b1e 0%, #18103c 40%, #100d28 75%, #0b0921 100%)"
          }}
        >
          {/* Aurora glows */}
          <div
            className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full"
            style={{ background: "radial-gradient(circle, rgb(99 80 240 / 0.22) 0%, transparent 70%)" }}
          />
          <div
            className="pointer-events-none absolute -bottom-8 right-16 h-40 w-40 rounded-full"
            style={{ background: "radial-gradient(circle, rgb(213 168 92 / 0.14) 0%, transparent 70%)" }}
          />
          <div
            className="pointer-events-none absolute right-0 top-0 h-full w-64"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgb(99 80 240 / 0.04) 50%, rgb(99 80 240 / 0.08) 100%)"
            }}
          />

          <div className="relative flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              {/* System status badge */}
              <div
                className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.65rem] font-bold uppercase tracking-widest"
                style={{
                  borderColor: systemOk ? "rgb(80 200 152 / 0.35)" : "rgb(248 116 112 / 0.35)",
                  background: systemOk ? "rgb(80 200 152 / 0.08)" : "rgb(248 116 112 / 0.08)",
                  color: systemOk ? "rgb(80 200 152)" : "rgb(248 116 112)"
                }}
              >
                <span
                  className="h-1.5 w-1.5 animate-pulse rounded-full"
                  style={{ background: systemOk ? "rgb(80 200 152)" : "rgb(248 116 112)" }}
                />
                {systemOk
                  ? "Todos os sistemas operacionais"
                  : `${criticalCount} alerta${criticalCount !== 1 ? "s" : ""} critico${criticalCount !== 1 ? "s" : ""} ativo${criticalCount !== 1 ? "s" : ""}`}
              </div>

              <h1 className="font-display text-2xl font-bold tracking-tight text-white md:text-3xl">
                Central de{" "}
                <span
                  style={{
                    background: "linear-gradient(135deg, rgb(156 138 255), rgb(213 168 92))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text"
                  }}
                >
                  operacao
                </span>
              </h1>
              <p className="mt-1 text-[0.78rem]" style={{ color: "rgb(148 144 168)" }}>
                Visao executiva &middot; {clients.length} cliente{clients.length !== 1 ? "s" : ""} monitorado
                {clients.length !== 1 ? "s" : ""}
              </p>

              {/* Inline key stats */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[
                  { label: "MRR", value: money(mrr) },
                  { label: "Online", value: `${onlineCount}/${clients.length}` },
                  { label: "Saude", value: `${healthScore}%` },
                  { label: "Vendas 7d", value: String(totalSales7) }
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-lg px-2.5 py-1.5 text-[0.68rem]"
                    style={{ background: "rgb(255 255 255 / 0.07)" }}
                  >
                    <span style={{ color: "rgb(118 114 138)" }}>{label}: </span>
                    <strong style={{ color: "rgb(238 236 245)" }}>{value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <AdminFormDialog
                label="Novo cliente"
                title="Novo cliente"
                description="Cadastre app, banco, plano, mensalidade e renovacao."
                icon="building"
              >
                <ClientForm action={createAdminClientAction} />
                <div className="mt-4 rounded-xl border border-warning/25 bg-warning-soft px-3 py-2 text-[0.75rem] text-warning">
                  <div className="flex gap-2">
                    <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                    <span>
                      Guarde DATABASE_URL apenas de clientes que voce administra. Recomendado criptografar esse campo.
                    </span>
                  </div>
                </div>
              </AdminFormDialog>
              <form action="/api/admin/logout" method="POST">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-[0.78rem] font-semibold transition"
                  style={{
                    borderColor: "rgb(255 255 255 / 0.12)",
                    color: "rgb(148 144 168)",
                    background: "rgb(255 255 255 / 0.05)"
                  }}
                >
                  <LogOut size={13} />
                  Sair
                </button>
              </form>
            </div>
          </div>
        </header>

        {/* ── KPIs ───────────────────────────────────────────────── */}
        <section className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          <Kpi
            label="Clientes ativos"
            value={`${activeClients}/${clients.length}`}
            icon={<Users size={18} />}
            tone={activeClients === clients.length ? "success" : "warning"}
            progress={{ value: activeClients, max: clients.length }}
          />
          <Kpi
            label="Online agora"
            value={`${onlineCount}/${clients.length}`}
            icon={<Activity size={18} />}
            tone={onlineCount === clients.length ? "success" : onlineCount === 0 ? "danger" : "warning"}
            progress={{ value: onlineCount, max: clients.length }}
          />
          <Kpi
            label="Saude da base"
            value={`${healthScore}%`}
            icon={<Cpu size={18} />}
            tone={healthScore >= 85 ? "success" : healthScore >= 60 ? "warning" : "danger"}
            progress={{ value: healthScore, max: 100 }}
          />
          <Kpi
            label="MRR cadastrado"
            value={money(mrr)}
            icon={<CircleDollarSign size={18} />}
            tone="primary"
            sub={`ARPU ${money(arpu)}`}
          />
          <Kpi
            label="Vendas agregadas"
            value={totalSales7}
            icon={<ShoppingBag size={18} />}
            tone="neutral"
            sub={`${totalSales30} em 30 dias`}
            progress={{ value: totalSales7, max: Math.max(totalSales30, 1) }}
          />
        </section>

        {/* ── MAIN + SIDEBAR ─────────────────────────────────────── */}
        <section className="grid min-h-0 gap-3 overflow-hidden xl:grid-cols-[minmax(0,1fr)_330px]">

          {/* Client list */}
          <main className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden">
            <form className="surface-card grid gap-3 p-3 md:grid-cols-[1fr_150px_150px_auto] md:items-end">
              <label className="label">
                Buscar
                <span className="relative">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle"
                  />
                  <input
                    className="field h-9 pl-9 text-sm"
                    name="q"
                    defaultValue={q ?? ""}
                    placeholder="Nome, loja ou chave"
                  />
                </span>
              </label>
              <label className="label">
                Status
                <select className="field h-9 text-sm" name="status" defaultValue={status ?? "ALL"}>
                  <option value="ALL">Todos</option>
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="label">
                Plano
                <select className="field h-9 text-sm" name="plan" defaultValue={plan ?? "ALL"}>
                  <option value="ALL">Todos</option>
                  {Object.entries(PLAN_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button-primary h-9 px-4 py-0 text-sm">Filtrar</button>
            </form>

            {clients.length === 0 ? (
              <div className="grid min-h-0 place-items-center rounded-2xl border border-dashed border-border bg-surface-2/30 p-8 text-center">
                <div>
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
                    <Building2 size={24} strokeWidth={2.1} />
                  </span>
                  <p className="mt-4 font-display text-lg font-semibold tracking-tight text-fg">
                    Nenhum cliente cadastrado
                  </p>
                  <p className="mt-2 max-w-sm text-[0.86rem] text-muted">
                    Use o botao Novo cliente para montar sua grade master.
                  </p>
                </div>
              </div>
            ) : sorted.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">
                Nenhum cliente encontrado com os filtros atuais.
              </div>
            ) : (
              <div className="grid min-h-0 content-start gap-3 overflow-y-auto pr-1">
                {sorted.map((client) => (
                  <ClientCard
                    key={client.key}
                    client={client}
                    dbClient={dbByKey.get(client.key)}
                    mrr={mrr}
                  />
                ))}
              </div>
            )}
          </main>

          {/* Sidebar */}
          <aside className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-3 overflow-hidden">

            {/* 2x2 insight cards */}
            <div className="grid grid-cols-2 gap-2">
              <InsightCard
                title="Em risco"
                value={atRisk}
                sub="offline, critico ou sem venda"
                icon={<AlertTriangle size={15} />}
                tone={atRisk ? "warning" : "success"}
              />
              <InsightCard
                title="Novos clientes"
                value={newCustomers30}
                sub="finais em 30 dias"
                icon={<TrendingUp size={15} />}
                tone="primary"
              />
              <InsightCard
                title="Bancos online"
                value={`${onlineCount}/${clients.length}`}
                sub={
                  onlineCount === clients.length
                    ? "todos respondendo"
                    : `${clients.length - onlineCount} fora`
                }
                icon={<Database size={15} />}
                tone={onlineCount === clients.length ? "success" : "danger"}
              />
              <InsightCard
                title="Alertas"
                value={totalAlerts}
                sub={criticalCount ? `${criticalCount} criticos` : "sem criticos"}
                icon={<ShieldAlert size={15} />}
                tone={criticalCount ? "danger" : totalAlerts ? "warning" : "success"}
              />
            </div>

            {/* Priority alerts */}
            <section className="surface-card p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-sm font-bold tracking-tight text-fg">
                    Alertas prioritarios
                  </h2>
                  <p className="text-[0.68rem] text-muted">Requer acao imediata.</p>
                </div>
                <span
                  className={`grid h-8 w-8 place-items-center rounded-xl ${
                    criticalCount ? "bg-danger-soft text-danger" : "bg-surface-2 text-muted"
                  }`}
                >
                  <AlertTriangle size={14} />
                </span>
              </div>
              {priorityAlerts.length ? (
                <ul className="grid gap-2">
                  {priorityAlerts.map(({ client, alert }, index) => (
                    <li
                      key={`${client.key}-${index}`}
                      className={`flex gap-3 rounded-xl border p-2.5 ${
                        alert.level === "critical"
                          ? "border-danger/20 bg-danger-soft/40"
                          : "border-warning/20 bg-warning-soft/40"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.58rem] font-bold text-white ${
                          alert.level === "critical" ? "bg-danger" : "bg-warning"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[0.71rem] font-bold text-fg">{client.storeName}</p>
                        <p
                          className={`text-[0.67rem] font-medium ${
                            alert.level === "critical" ? "text-danger" : "text-warning"
                          }`}
                        >
                          {alert.message}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success-soft/50 p-3 text-[0.75rem] font-semibold text-success">
                  <ShieldCheck size={13} /> Tudo limpo nos clientes monitorados.
                </div>
              )}
            </section>

            {/* CEO Agenda / Financial */}
            <section className="surface-card min-h-0 overflow-hidden p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-sm font-bold tracking-tight text-fg">
                    Agenda financeira
                  </h2>
                  <p className="text-[0.68rem] text-muted">MRR e renovacoes.</p>
                </div>
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-soft text-primary">
                  <CalendarClock size={14} />
                </span>
              </div>

              {/* MRR summary */}
              <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-border bg-surface-2/40 p-3">
                <div>
                  <p className="text-[0.6rem] font-bold uppercase tracking-widest text-subtle">MRR atual</p>
                  <strong className="mt-0.5 block font-display text-base font-bold text-fg">{money(mrr)}</strong>
                </div>
                <div className="text-right">
                  <p className="text-[0.6rem] font-bold uppercase tracking-widest text-subtle">Ticket medio</p>
                  <strong className="mt-0.5 block font-display text-base font-bold text-fg">{money(arpu)}</strong>
                </div>
              </div>

              {/* Renewal list with revenue bars */}
              <div className="grid min-h-0 gap-2 overflow-y-auto pr-1">
                {renewals.length ? (
                  renewals.map((client) => {
                    const fee = Number(client.monthlyFee ?? 0);
                    const pct = mrr > 0 ? Math.round((fee / mrr) * 100) : 0;
                    return (
                      <div
                        key={client.id}
                        className="rounded-xl border border-border/60 bg-surface-2/30 p-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[0.75rem] font-bold text-fg">
                            {client.storeName ?? client.name}
                          </p>
                          <strong className="shrink-0 text-[0.75rem] text-fg">{money(fee)}</strong>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3/50">
                            <div
                              className="h-full rounded-full bg-accent transition-all duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="shrink-0 text-[0.6rem] font-semibold text-muted">
                            dia {client.renewalDay}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-xl border border-border bg-surface-2/40 p-3 text-[0.75rem] text-muted">
                    Cadastre o dia de renovacao para montar a agenda financeira.
                  </div>
                )}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </div>
  );
}
