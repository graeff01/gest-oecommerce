import { connection } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Crown,
  ExternalLink,
  Flame,
  Gauge,
  Heart,
  Info,
  ListTodo,
  LogOut,
  Receipt,
  Search,
  ScrollText,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingDown,
  Trash2,
  Trophy,
  Users,
  XCircle,
  Zap
} from "lucide-react";
import { AdminClientPlan, AdminClientStatus } from "@prisma/client";
import { fetchAllClients, ClientSnapshot, Alert } from "@/lib/admin-clients";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/admin-crypto";
import { ADMIN_COOKIE, getAdminSessionFromToken } from "@/lib/admin-auth";
import { getTaskCountsByClient } from "@/lib/admin-tasks";
import { AdminFormDialog } from "@/components/admin-form-dialog";
import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { TvMode } from "@/components/admin/TvMode";
import { CommandPalette } from "@/components/admin/CommandPalette";
import { ContactQuickActions } from "@/components/admin/ContactQuickActions";
import { CaptureAllSnapshotsButton } from "@/components/admin/CaptureSnapshotButton";
import { PrintButton } from "@/components/admin/PrintButton";
import {
  createAdminClientAction,
  deleteAdminClientAction,
  setAdminClientStatusAction,
  updateAdminClientAction
} from "./actions";

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

function moneyCompact(value: number) {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
  return money(value);
}

function fmtDate() {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date());
}

function calcClientHealth(client: ClientSnapshot): number {
  let score = 0;
  if (client.online) score += 30;
  if (client.status === "ACTIVE") score += 20;
  if (client.salesLast7 >= 5) score += 25;
  else if (client.salesLast7 > 0) score += 18;
  else if (client.salesLast30 > 0) score += 8;
  const critical = client.alerts.filter((a) => a.level === "critical").length;
  if (critical === 0) score += 15;
  else score -= critical * 5;
  const warnings = client.alerts.filter((a) => a.level === "warning").length;
  if (warnings === 0) score += 10;
  else score -= warnings * 2;
  return Math.max(0, Math.min(100, score));
}

function clientGrowthRate(client: ClientSnapshot): number {
  // crude growth signal: 7d * 4 vs 30d. > 1 = aceleracao, < 1 = desaceleracao
  const projected = client.salesLast7 * (30 / 7);
  if (client.salesLast30 === 0) return projected > 0 ? 1.5 : 0;
  return projected / client.salesLast30;
}

function StatusDot({ online }: { online: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      {online && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
      )}
      <span
        className={`relative inline-flex h-2.5 w-2.5 rounded-full ${online ? "bg-success" : "bg-danger"}`}
      />
    </span>
  );
}

function HealthRing({ score, size = 56 }: { score: number; size?: number }) {
  const color = score >= 80 ? "rgb(38 159 113)" : score >= 60 ? "rgb(218 156 64)" : "rgb(224 84 78)";
  const bg = score >= 80 ? "rgb(38 159 113 / 0.12)" : score >= 60 ? "rgb(218 156 64 / 0.12)" : "rgb(224 84 78 / 0.12)";
  return (
    <div
      className="relative grid place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${color} ${score * 3.6}deg, ${bg} 0deg)`
      }}
    >
      <div
        className="absolute grid place-items-center rounded-full bg-surface text-fg shadow-soft"
        style={{ width: size - 10, height: size - 10 }}
      >
        <strong className="font-display text-sm font-bold leading-none">{score}</strong>
      </div>
    </div>
  );
}

function AlertRow({ alert }: { alert: Alert }) {
  const cfg = {
    critical: { cls: "text-danger", icon: <XCircle size={11} className="mt-0.5 shrink-0" /> },
    warning: { cls: "text-warning", icon: <AlertTriangle size={11} className="mt-0.5 shrink-0" /> },
    info: { cls: "text-primary", icon: <Info size={11} className="mt-0.5 shrink-0" /> }
  }[alert.level];
  return (
    <li className={`flex items-start gap-2 text-[0.74rem] font-medium leading-snug ${cfg.cls}`}>
      {cfg.icon}
      <span>{alert.message}</span>
    </li>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border/50 bg-surface-2/30 px-3 py-2.5">
      <span className="text-[0.58rem] font-bold uppercase tracking-widest text-subtle">{label}</span>
      <strong className={`mt-1 block truncate font-display text-sm font-bold leading-tight tracking-tight ${accent ?? "text-fg"}`}>
        {value}
      </strong>
      {sub && <span className="mt-0.5 block truncate text-[0.62rem] text-muted">{sub}</span>}
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
    contactName: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
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
          <input className="field" name="appUrl" defaultValue={client?.appUrl ?? ""} placeholder="https://cliente.up.railway.app" />
        </label>
      </div>
      <label className="label">
        DATABASE_URL do cliente
        <textarea className="field min-h-20 font-mono text-xs" name="databaseUrl" defaultValue={client?.databaseUrl ?? ""} required />
      </label>

      <div className="rounded-xl border border-border bg-surface-2/30 p-3">
        <p className="mb-2 text-[0.62rem] font-bold uppercase tracking-widest text-subtle">Contato (libera WhatsApp e e-mail no painel)</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="label">
            Nome do contato
            <input className="field" name="contactName" defaultValue={client?.contactName ?? ""} placeholder="Joao Silva" />
          </label>
          <label className="label">
            Telefone (DDI+DDD+numero)
            <input className="field" name="contactPhone" defaultValue={client?.contactPhone ?? ""} placeholder="5547999998888" />
          </label>
          <label className="label">
            E-mail
            <input className="field" name="contactEmail" defaultValue={client?.contactEmail ?? ""} placeholder="contato@cliente.com" />
          </label>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="label">
          Status
          <select className="field" name="status" defaultValue={client?.status ?? "TRIAL"}>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="label">
          Plano
          <select className="field" name="plan" defaultValue={client?.plan ?? "STARTER"}>
            {Object.entries(PLAN_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="label">
          Mensalidade
          <input className="field" name="monthlyFee" type="number" min="0" step="0.01" defaultValue={client?.monthlyFee === null || client?.monthlyFee === undefined ? "" : String(client.monthlyFee)} />
        </label>
        <label className="label">
          Dia de renovacao
          <input className="field" name="renewalDay" type="number" min="1" max="31" defaultValue={client?.renewalDay ?? ""} />
        </label>
      </div>
      <label className="label">
        Observacoes / contexto do cliente
        <textarea className="field min-h-20" name="notes" defaultValue={client?.notes ?? ""} placeholder="Ex: Cliente prefere contato por WhatsApp. Migracao para Pro em estudo." />
      </label>
      <button className="button-primary">{client ? "Salvar cliente" : "Cadastrar cliente"}</button>
    </form>
  );
}

function ClientCard({
  client,
  dbClient,
  mrr,
  health,
  taskCount
}: {
  client: ClientSnapshot;
  dbClient?: Awaited<ReturnType<typeof prisma.adminClient.findMany>>[number];
  mrr: number;
  health: number;
  taskCount?: { open: number; overdue: number };
}) {
  const criticalAlerts = client.alerts.filter((a) => a.level === "critical").length;
  const hasCritical = criticalAlerts > 0 || !client.online || client.status === "SUSPENDED";
  const isHealthy = client.online && criticalAlerts === 0 && client.status === "ACTIVE";
  const stripeColor = hasCritical ? "bg-danger" : isHealthy ? "bg-success" : "bg-warning";
  const cardBorder = hasCritical ? "border-danger/30" : "border-border";
  const cardBg = hasCritical ? "bg-danger-soft/[0.07]" : "bg-surface";
  const mrrPct = mrr > 0 && client.monthlyFee ? Math.round((client.monthlyFee / mrr) * 100) : 0;
  const growth = clientGrowthRate(client);
  const trendUp = growth > 1.1;
  const trendDown = growth < 0.9 && client.salesLast30 > 0;
  const notes = dbClient?.notes?.trim();

  return (
    <article
      id={`c-${client.key}`}
      className={`group relative overflow-hidden rounded-2xl border shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg ${cardBorder} ${cardBg}`}
    >
      <div className={`absolute left-0 top-0 h-full w-1 ${stripeColor}`} />

      <div className="flex flex-col gap-3 p-4 pl-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <HealthRing score={health} size={52} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <StatusDot online={client.online} />
              <p className="truncate font-display text-base font-bold leading-tight text-fg">{client.storeName}</p>
            </div>
            <p className="mt-0.5 truncate text-[0.71rem] text-muted">
              {client.name} &middot; {client.key}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className={`status-pill ${client.status === "ACTIVE" ? "" : client.status === "SUSPENDED" || client.status === "CANCELED" ? "pill-danger" : "pill-warning"}`}>
                {STATUS_LABEL[client.status]}
              </span>
              <span className="status-pill pill-primary">{PLAN_LABEL[client.plan]}</span>
              {client.monthlyFee ? <span className="chip">{money(client.monthlyFee)}/mes</span> : null}
              {trendUp && (
                <span className="inline-flex items-center gap-1 rounded-full border border-success/25 bg-success-soft/60 px-2 py-0.5 text-[0.65rem] font-bold text-success">
                  <ArrowUpRight size={10} /> Acelerando
                </span>
              )}
              {trendDown && (
                <span className="inline-flex items-center gap-1 rounded-full border border-danger/25 bg-danger-soft/60 px-2 py-0.5 text-[0.65rem] font-bold text-danger">
                  <ArrowDownRight size={10} /> Desacelerando
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-1.5 lg:justify-end">
          {taskCount && taskCount.open > 0 && (
            <Link
              href={`/admin/client/${client.key}`}
              className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-bold transition ${
                taskCount.overdue > 0
                  ? "border-danger/30 bg-danger-soft/60 text-danger"
                  : "border-primary/30 bg-primary-soft/60 text-primary"
              }`}
              title={taskCount.overdue ? `${taskCount.overdue} tarefa(s) atrasada(s)` : `${taskCount.open} tarefa(s) aberta(s)`}
            >
              <ListTodo size={11} /> {taskCount.open}
              {taskCount.overdue > 0 && <span className="font-bold">!</span>}
            </Link>
          )}
          <Link
            href={`/admin/client/${client.key}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary-soft/60 px-3 text-xs font-bold text-primary transition hover:bg-primary-soft"
          >
            Detalhes <ArrowRight size={11} />
          </Link>
          {client.appUrl ? (
            <a href={client.appUrl} target="_blank" rel="noreferrer" className="button-secondary h-8 gap-1.5 px-3 py-0 text-xs">
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

      {dbClient && (dbClient.contactPhone || dbClient.contactEmail) && (
        <div className="mx-4 ml-5 mb-3">
          <ContactQuickActions
            storeName={client.storeName}
            contactName={dbClient.contactName}
            contactPhone={dbClient.contactPhone}
            contactEmail={dbClient.contactEmail}
            monthlyFee={client.monthlyFee}
            renewalDay={client.renewalDay}
            variant="row"
          />
        </div>
      )}

      {!client.online && (
        <div className="mx-4 ml-5 mb-3 rounded-xl border border-danger/20 bg-danger-soft/60 px-3 py-2 text-[0.74rem] font-medium text-danger">
          {client.error ?? "Cliente offline ou banco inacessivel."}
        </div>
      )}

      {notes && (
        <div className="mx-4 ml-5 mb-3 flex gap-2 rounded-xl border border-accent/20 bg-accent-soft/40 px-3 py-2 text-[0.74rem] font-medium text-fg/85">
          <Sparkles size={12} className="mt-0.5 shrink-0 text-accent" />
          <span className="line-clamp-2">{notes}</span>
        </div>
      )}

      <div className="mx-4 ml-5 grid gap-2 border-t border-border/50 pt-3 pb-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Ultima venda" value={client.lastSaleAgo ?? "Nunca"} accent={client.lastSaleAgo ? "text-fg" : "text-danger"} />
        <Stat label="Vendas 7d" value={client.salesLast7} sub={`${client.salesLast30} em 30d`} accent={client.salesLast7 > 0 ? "text-success" : "text-danger"} />
        <Stat label="Usuarios" value={`${client.activeUsers}/${client.totalUsers}`} sub="ativos" />
        <Stat label="Catalogo" value={client.totalProducts} sub={client.productsWithoutVariants ? `${client.productsWithoutVariants} incompletos` : "ok"} accent={client.productsWithoutVariants ? "text-warning" : "text-fg"} />
        <Stat label="Clientes" value={client.totalCustomers} sub={`+${client.newCustomersLast30} em 30d`} />
      </div>

      {client.alerts.length > 0 ? (
        <ul className="mx-4 ml-5 grid gap-1.5 border-t border-border/50 pt-3 pb-3">
          {client.alerts.slice(0, 4).map((a, i) => <AlertRow key={i} alert={a} />)}
          {client.alerts.length > 4 ? (
            <li className="text-[0.7rem] font-semibold text-muted">+{client.alerts.length - 4} alerta(s) adicional</li>
          ) : null}
        </ul>
      ) : client.online ? (
        <div className="mx-4 ml-5 flex items-center gap-1.5 border-t border-border/50 pt-3 pb-3 text-[0.74rem] font-semibold text-success">
          <CheckCircle2 size={12} /> Operacao saudavel, sem alertas
        </div>
      ) : null}

      {mrr > 0 && client.monthlyFee ? (
        <div className="mx-4 ml-5 flex items-center gap-3 border-t border-border/50 pt-3 pb-3">
          <span className="shrink-0 text-[0.62rem] font-bold uppercase tracking-widest text-subtle">
            {mrrPct}% do MRR
          </span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3/50">
            <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${mrrPct}%` }} />
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
            <input
              className="h-7 w-28 rounded-xl border border-danger/25 bg-surface px-2 text-[0.7rem] font-semibold text-danger outline-none"
              name="confirmKey"
              placeholder={client.key}
              aria-label={`Digite ${client.key} para remover`}
            />
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
  const adminSession = getAdminSessionFromToken(token);

  if (!adminSession) {
    redirect("/admin/login");
  }

  const [{ q, status, plan }, clients, rawDbClients, taskCounts] = await Promise.all([
    searchParams,
    fetchAllClients(),
    prisma.adminClient.findMany({ orderBy: [{ status: "asc" }, { name: "asc" }] }).catch(() => []),
    getTaskCountsByClient().catch(() => new Map<string, { open: number; overdue: number }>())
  ]);

  const dbClients = rawDbClients.map((client) => ({
    ...client,
    databaseUrl: decryptSecret(client.databaseUrl)
  }));
  const dbByKey = new Map(dbClients.map((c) => [c.key, c]));
  const normalizedQuery = q?.trim().toLowerCase() ?? "";
  const filtered = clients.filter((c) => {
    const matchesQuery = !normalizedQuery || [c.name, c.storeName, c.key].join(" ").toLowerCase().includes(normalizedQuery);
    const matchesStatus = !status || status === "ALL" || c.status === status;
    const matchesPlan = !plan || plan === "ALL" || c.plan === plan;
    return matchesQuery && matchesStatus && matchesPlan;
  });

  // Per-client health scores
  const withHealth = clients.map((c) => ({ client: c, health: calcClientHealth(c) }));
  const healthByKey = new Map(withHealth.map(({ client, health }) => [client.key, health]));

  // Sort: offline first, then by alert count
  const sorted = [...filtered].sort((a, b) => {
    if (!a.online && b.online) return -1;
    if (a.online && !b.online) return 1;
    return b.alertCount - a.alertCount;
  });

  // ── METRICS ──────────────────────────────────────────────────
  const onlineCount = clients.filter((c) => c.online).length;
  const totalAlerts = clients.reduce((s, c) => s + c.alertCount, 0);
  const criticalCount = clients.reduce((s, c) => s + c.alerts.filter((a) => a.level === "critical").length, 0);
  const totalSales7 = clients.reduce((s, c) => s + c.salesLast7, 0);
  const totalSales30 = clients.reduce((s, c) => s + c.salesLast30, 0);
  const projected30From7 = totalSales7 * (30 / 7);
  const salesMomentum = totalSales30 > 0 ? projected30From7 / totalSales30 : 1;
  const newCustomers30 = clients.reduce((s, c) => s + c.newCustomersLast30, 0);
  const totalCustomers = clients.reduce((s, c) => s + c.totalCustomers, 0);
  const totalProducts = clients.reduce((s, c) => s + c.totalProducts, 0);
  const mrr = dbClients.reduce((s, c) => s + Number(c.monthlyFee ?? 0), 0);
  const activeClients = clients.filter((c) => c.status === "ACTIVE").length;
  const trialClients = clients.filter((c) => c.status === "TRIAL").length;
  const setupClients = clients.filter((c) => c.status === "SETUP").length;
  const suspendedClients = clients.filter((c) => c.status === "SUSPENDED" || c.status === "CANCELED").length;
  const payingClients = dbClients.filter((c) => Number(c.monthlyFee ?? 0) > 0).length;
  const arpu = payingClients ? mrr / payingClients : 0;
  const atRisk = clients.filter(
    (c) => !c.online || c.alerts.some((a) => a.level === "critical") || c.status === "SUSPENDED" || c.salesLast30 === 0
  ).length;
  const avgHealth = withHealth.length ? Math.round(withHealth.reduce((s, x) => s + x.health, 0) / withHealth.length) : 100;

  // MRR by plan
  const mrrByPlan: Record<AdminClientPlan, number> = { STARTER: 0, PRO: 0, BUSINESS: 0, ENTERPRISE: 0 };
  const countByPlan: Record<AdminClientPlan, number> = { STARTER: 0, PRO: 0, BUSINESS: 0, ENTERPRISE: 0 };
  dbClients.forEach((c) => {
    mrrByPlan[c.plan] += Number(c.monthlyFee ?? 0);
    countByPlan[c.plan]++;
  });

  // Renewals next 7 days
  const today = new Date();
  const todayDay = today.getDate();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const renewingNext7 = dbClients.filter((c) => {
    if (!c.renewalDay) return false;
    let diff = c.renewalDay - todayDay;
    if (diff < 0) diff += lastDay;
    return diff >= 0 && diff <= 7;
  });
  const expectedNext7 = renewingNext7.reduce((s, c) => s + Number(c.monthlyFee ?? 0), 0);

  const allRenewals = dbClients
    .filter((c) => c.renewalDay)
    .map((c) => {
      let daysUntil = (c.renewalDay ?? 0) - todayDay;
      if (daysUntil < 0) daysUntil += lastDay;
      return { client: c, daysUntil };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);

  // Top performer (most sales 7d among active clients)
  const topPerformer = [...clients].sort((a, b) => b.salesLast7 - a.salesLast7)[0];
  // Worst (most alerts or critical)
  const worstClient = [...withHealth].sort((a, b) => a.health - b.health)[0];

  // ── SMART RECOMMENDATIONS ────────────────────────────────────
  type Recommendation = {
    priority: "critical" | "high" | "medium" | "opportunity";
    icon: React.ReactNode;
    title: string;
    desc: string;
    tone: "danger" | "warning" | "primary" | "success" | "accent";
  };
  const recommendations: Recommendation[] = [];

  if (criticalCount > 0) {
    recommendations.push({
      priority: "critical",
      icon: <Flame size={16} />,
      title: `${criticalCount} alerta${criticalCount > 1 ? "s" : ""} critico${criticalCount > 1 ? "s" : ""} para resolver agora`,
      desc: "Veja os cards marcados em vermelho abaixo e tome acao imediata.",
      tone: "danger"
    });
  }
  if (renewingNext7.length > 0) {
    recommendations.push({
      priority: "high",
      icon: <Receipt size={16} />,
      title: `${renewingNext7.length} renovacao${renewingNext7.length > 1 ? "oes" : ""} nos proximos 7 dias`,
      desc: `${money(expectedNext7)} previsto para cobrar. Confirme as faturas com os clientes.`,
      tone: "primary"
    });
  }
  const upgradeCandidates = withHealth.filter(({ client, health }) =>
    health >= 80 && client.plan === "STARTER" && client.salesLast7 >= 3 && client.status === "ACTIVE"
  );
  if (upgradeCandidates.length > 0) {
    recommendations.push({
      priority: "opportunity",
      icon: <Crown size={16} />,
      title: `${upgradeCandidates.length} oportunidade${upgradeCandidates.length > 1 ? "s" : ""} de upgrade`,
      desc: `${upgradeCandidates.map((u) => u.client.storeName).slice(0, 3).join(", ")}${upgradeCandidates.length > 3 ? "..." : ""} estao crescendo no Starter. Oferecer Pro.`,
      tone: "accent"
    });
  }
  const stagnant = clients.filter((c) => c.online && c.status === "ACTIVE" && c.salesLast7 === 0 && c.salesLast30 > 0);
  if (stagnant.length > 0) {
    recommendations.push({
      priority: "medium",
      icon: <TrendingDown size={16} />,
      title: `${stagnant.length} cliente${stagnant.length > 1 ? "s" : ""} sem vendas esta semana`,
      desc: `Investigar: ${stagnant.map((c) => c.storeName).slice(0, 3).join(", ")}${stagnant.length > 3 ? "..." : ""}.`,
      tone: "warning"
    });
  }
  if (trialClients > 0) {
    recommendations.push({
      priority: "medium",
      icon: <Target size={16} />,
      title: `${trialClients} cliente${trialClients > 1 ? "s" : ""} em periodo de teste`,
      desc: "Acompanhar de perto e converter antes do fim do trial.",
      tone: "primary"
    });
  }
  if (setupClients > 0) {
    recommendations.push({
      priority: "medium",
      icon: <Zap size={16} />,
      title: `${setupClients} cliente${setupClients > 1 ? "s" : ""} em implantacao`,
      desc: "Garantir onboarding completo e primeiras vendas.",
      tone: "primary"
    });
  }
  if (recommendations.length === 0) {
    recommendations.push({
      priority: "opportunity",
      icon: <Trophy size={16} />,
      title: "Tudo sob controle",
      desc: "Nenhuma acao critica pendente. Hora de prospectar novos clientes.",
      tone: "success"
    });
  }

  const systemOk = criticalCount === 0 && (clients.length === 0 || onlineCount === clients.length);

  // ── RENDER ──────────────────────────────────────────────────
  return (
    <div className="min-h-full">
      <div className="space-y-4 p-4 md:p-6 xl:p-8 2xl:p-10">

        {/* ╔══════════════════════════════════════════════════════════════╗
            HERO COMMAND CENTER
            ╚══════════════════════════════════════════════════════════════╝ */}
        <header
          className="relative overflow-hidden rounded-[1.5rem] border border-indigo-900/40 shadow-2xl"
          style={{
            background:
              "linear-gradient(135deg, #07061a 0%, #14103a 35%, #1d1456 60%, #0e0a2a 100%)"
          }}
        >
          {/* Aurora overlays */}
          <div
            className="pointer-events-none absolute -left-20 -top-24 h-80 w-80 rounded-full"
            style={{ background: "radial-gradient(circle, rgb(99 80 240 / 0.32) 0%, transparent 70%)" }}
          />
          <div
            className="pointer-events-none absolute -right-16 top-10 h-72 w-72 rounded-full"
            style={{ background: "radial-gradient(circle, rgb(213 168 92 / 0.20) 0%, transparent 70%)" }}
          />
          <div
            className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-96 rounded-full opacity-50"
            style={{ background: "radial-gradient(circle, rgb(138 122 255 / 0.18) 0%, transparent 70%)" }}
          />
          {/* Grid pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(rgb(255 255 255) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255) 1px, transparent 1px)",
              backgroundSize: "32px 32px"
            }}
          />

          <div className="relative grid gap-6 p-6 lg:grid-cols-[1.4fr_1fr] lg:gap-8 lg:p-8 2xl:grid-cols-[1.6fr_1fr] 2xl:p-10">
            {/* Left: title & status */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.65rem] font-bold uppercase tracking-widest"
                  style={{
                    borderColor: systemOk ? "rgb(80 200 152 / 0.4)" : "rgb(248 116 112 / 0.4)",
                    background: systemOk ? "rgb(80 200 152 / 0.1)" : "rgb(248 116 112 / 0.1)",
                    color: systemOk ? "rgb(120 220 175)" : "rgb(252 140 135)"
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 animate-pulse rounded-full"
                    style={{ background: systemOk ? "rgb(120 220 175)" : "rgb(252 140 135)" }}
                  />
                  {systemOk ? "Sistemas operacionais" : `${criticalCount} critico${criticalCount !== 1 ? "s" : ""}`}
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[0.65rem] font-semibold text-white/70">
                  <Clock size={11} />
                  {fmtDate()}
                </span>
              </div>

              <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-[2.6rem]">
                Bem-vindo,{" "}
                <span
                  style={{
                    background: "linear-gradient(135deg, rgb(174 156 255), rgb(232 192 122))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text"
                  }}
                >
                  CEO
                </span>
              </h1>
              <p className="mt-2 max-w-xl text-[0.88rem] leading-relaxed text-white/60">
                Voce administra <strong className="text-white/90">{clients.length} loja{clients.length !== 1 ? "s" : ""}</strong> com{" "}
                <strong className="text-white/90">{totalCustomers.toLocaleString("pt-BR")} clientes finais</strong> e{" "}
                <strong className="text-white/90">{totalProducts.toLocaleString("pt-BR")} produtos cadastrados</strong>.
                Aqui esta o pulso completo da operacao.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2">
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
                      <span>Guarde DATABASE_URL apenas de clientes que voce administra.</span>
                    </div>
                  </div>
                </AdminFormDialog>
                <CommandPalette
                  clients={withHealth.map(({ client, health }) => ({
                    key: client.key,
                    storeName: client.storeName,
                    name: client.name,
                    appUrl: client.appUrl,
                    health,
                    online: client.online,
                    alertCount: client.alertCount
                  }))}
                />
                <CaptureAllSnapshotsButton />
                <TvMode />
                <AutoRefresh intervalMs={60000} />
                <PrintButton />
                <Link
                  href="/admin/auditoria"
                  className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-[0.82rem] font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  <ScrollText size={13} /> Auditoria
                </Link>
                <form action="/api/admin/logout" method="POST">
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-[0.82rem] font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                  >
                    <LogOut size={13} /> Sair
                  </button>
                </form>
              </div>
            </div>

            {/* Right: key metrics tiles */}
            <div className="grid grid-cols-2 gap-3 2xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300">
                    <CircleDollarSign size={15} />
                  </span>
                  <span className="text-[0.6rem] font-bold uppercase tracking-widest text-white/40">MRR</span>
                </div>
                <strong className="mt-2 block font-display text-2xl font-bold text-white">{moneyCompact(mrr)}</strong>
                <p className="mt-0.5 text-[0.68rem] text-white/50">ARPU {moneyCompact(arpu)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-500/15 text-indigo-300">
                    <Heart size={15} />
                  </span>
                  <span className="text-[0.6rem] font-bold uppercase tracking-widest text-white/40">Saude media</span>
                </div>
                <strong className="mt-2 block font-display text-2xl font-bold text-white">{avgHealth}%</strong>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${avgHealth}%`,
                      background: avgHealth >= 80 ? "rgb(80 200 152)" : avgHealth >= 60 ? "rgb(240 188 92)" : "rgb(248 116 112)"
                    }}
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-500/15 text-sky-300">
                    <Activity size={15} />
                  </span>
                  <span className="text-[0.6rem] font-bold uppercase tracking-widest text-white/40">Online</span>
                </div>
                <strong className="mt-2 block font-display text-2xl font-bold text-white">{onlineCount}/{clients.length}</strong>
                <p className="mt-0.5 text-[0.68rem] text-white/50">
                  {onlineCount === clients.length ? "todos conectados" : `${clients.length - onlineCount} fora do ar`}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/15 text-amber-300">
                    <ShoppingBag size={15} />
                  </span>
                  <span className="text-[0.6rem] font-bold uppercase tracking-widest text-white/40">Vendas 7d</span>
                </div>
                <strong className="mt-2 block font-display text-2xl font-bold text-white">{totalSales7}</strong>
                <p className="mt-0.5 flex items-center gap-1 text-[0.68rem] text-white/50">
                  {salesMomentum > 1.05 ? (
                    <>
                      <ArrowUpRight size={10} className="text-emerald-300" />
                      <span className="text-emerald-300">acelerando</span>
                    </>
                  ) : salesMomentum < 0.95 ? (
                    <>
                      <ArrowDownRight size={10} className="text-rose-300" />
                      <span className="text-rose-300">desacelerando</span>
                    </>
                  ) : (
                    <span>{totalSales30} em 30d</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* ╔══════════════════════════════════════════════════════════════╗
            SMART RECOMMENDATIONS - "O QUE FAZER AGORA"
            ╚══════════════════════════════════════════════════════════════╝ */}
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                <Sparkles size={18} />
              </span>
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight text-fg">O que fazer agora</h2>
                <p className="text-[0.75rem] text-muted">Recomendacoes inteligentes baseadas no estado atual da base</p>
              </div>
            </div>
            <span className="rounded-full bg-primary-soft px-3 py-1 text-[0.66rem] font-bold uppercase tracking-widest text-primary">
              {recommendations.length} acao{recommendations.length !== 1 ? "es" : ""}
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {recommendations.map((rec, idx) => {
              const toneMap = {
                danger: { border: "border-danger/30", bg: "bg-danger-soft/30", icon: "bg-danger/15 text-danger", chip: "bg-danger text-white" },
                warning: { border: "border-warning/30", bg: "bg-warning-soft/30", icon: "bg-warning/15 text-warning", chip: "bg-warning text-white" },
                primary: { border: "border-primary/30", bg: "bg-primary-soft/30", icon: "bg-primary/15 text-primary", chip: "bg-primary text-white" },
                success: { border: "border-success/30", bg: "bg-success-soft/30", icon: "bg-success/15 text-success", chip: "bg-success text-white" },
                accent: { border: "border-accent/30", bg: "bg-accent-soft/40", icon: "bg-accent/15 text-accent", chip: "bg-accent text-white" }
              }[rec.tone];
              const priorityLabel = {
                critical: "URGENTE",
                high: "ALTA",
                medium: "MEDIA",
                opportunity: "OPORTUNIDADE"
              }[rec.priority];
              return (
                <div
                  key={idx}
                  className={`relative overflow-hidden rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${toneMap.border} ${toneMap.bg}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${toneMap.icon}`}>
                      {rec.icon}
                    </span>
                    <div className="min-w-0">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[0.58rem] font-bold tracking-widest ${toneMap.chip}`}>
                        {priorityLabel}
                      </span>
                      <p className="mt-2 text-[0.84rem] font-bold leading-tight text-fg">{rec.title}</p>
                      <p className="mt-1 text-[0.74rem] leading-snug text-muted">{rec.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ╔══════════════════════════════════════════════════════════════╗
            REVENUE INTEL + HEALTH MATRIX (side by side)
            ╚══════════════════════════════════════════════════════════════╝ */}
        <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">

          {/* Revenue Intelligence */}
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <Banknote size={18} />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold tracking-tight text-fg">Inteligencia financeira</h2>
                  <p className="text-[0.75rem] text-muted">Composicao da receita recorrente</p>
                </div>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border bg-surface-2/30 p-3">
                <p className="text-[0.6rem] font-bold uppercase tracking-widest text-subtle">MRR total</p>
                <strong className="mt-1 block font-display text-xl font-bold text-fg">{money(mrr)}</strong>
                <p className="mt-0.5 text-[0.66rem] text-muted">{payingClients} clientes pagantes</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-2/30 p-3">
                <p className="text-[0.6rem] font-bold uppercase tracking-widest text-subtle">ARR projetado</p>
                <strong className="mt-1 block font-display text-xl font-bold text-fg">{money(mrr * 12)}</strong>
                <p className="mt-0.5 text-[0.66rem] text-muted">se manter base atual</p>
              </div>
              <div className="rounded-xl border border-accent/25 bg-accent-soft/40 p-3">
                <p className="text-[0.6rem] font-bold uppercase tracking-widest text-accent">Proximos 7 dias</p>
                <strong className="mt-1 block font-display text-xl font-bold text-fg">{money(expectedNext7)}</strong>
                <p className="mt-0.5 text-[0.66rem] text-muted">{renewingNext7.length} cobranca{renewingNext7.length !== 1 ? "s" : ""}</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[0.66rem] font-bold uppercase tracking-widest text-subtle">Composicao por plano</p>
              <div className="space-y-2">
                {(["ENTERPRISE", "BUSINESS", "PRO", "STARTER"] as AdminClientPlan[])
                  .filter((p) => countByPlan[p] > 0)
                  .map((p) => {
                    const pct = mrr > 0 ? Math.round((mrrByPlan[p] / mrr) * 100) : 0;
                    const colors = {
                      STARTER: "bg-slate-400",
                      PRO: "bg-primary",
                      BUSINESS: "bg-accent",
                      ENTERPRISE: "bg-emerald-500"
                    }[p];
                    return (
                      <div key={p} className="grid grid-cols-[80px_1fr_auto_auto] items-center gap-3">
                        <span className="text-[0.72rem] font-bold text-fg">{PLAN_LABEL[p]}</span>
                        <div className="h-2 overflow-hidden rounded-full bg-surface-3/40">
                          <div className={`h-full rounded-full ${colors} transition-all duration-700`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-12 text-right text-[0.72rem] font-bold text-fg">{money(mrrByPlan[p])}</span>
                        <span className="w-12 text-right text-[0.66rem] text-muted">{countByPlan[p]} cli &middot; {pct}%</span>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="mt-4 border-t border-border/60 pt-3">
              <p className="mb-2 text-[0.66rem] font-bold uppercase tracking-widest text-subtle">Distribuicao de status</p>
              <div className="flex gap-2">
                {[
                  { label: "Ativos", count: activeClients, color: "bg-success", soft: "bg-success-soft/60", text: "text-success" },
                  { label: "Trial", count: trialClients, color: "bg-warning", soft: "bg-warning-soft/60", text: "text-warning" },
                  { label: "Implant.", count: setupClients, color: "bg-warning", soft: "bg-warning-soft/60", text: "text-warning" },
                  { label: "Susp/Canc", count: suspendedClients, color: "bg-danger", soft: "bg-danger-soft/60", text: "text-danger" }
                ]
                  .filter((s) => s.count > 0)
                  .map((s) => (
                    <div key={s.label} className={`flex-1 rounded-lg ${s.soft} px-2.5 py-2`}>
                      <div className={`text-[0.6rem] font-bold uppercase tracking-widest ${s.text}`}>{s.label}</div>
                      <div className="mt-0.5 font-display text-base font-bold text-fg">{s.count}</div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Health Matrix */}
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-500/10 text-rose-600">
                  <Gauge size={18} />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold tracking-tight text-fg">Matriz de saude</h2>
                  <p className="text-[0.75rem] text-muted">Visao instantanea por cliente</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
              {withHealth.map(({ client, health }) => {
                const bg =
                  health >= 80
                    ? "bg-success/15 border-success/30 text-success"
                    : health >= 60
                      ? "bg-warning/15 border-warning/30 text-warning"
                      : "bg-danger/15 border-danger/30 text-danger";
                return (
                  <a
                    key={client.key}
                    href={`#c-${client.key}`}
                    className={`group relative flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-center transition hover:-translate-y-0.5 hover:shadow-md ${bg}`}
                    title={`${client.storeName} - ${health}/100`}
                  >
                    <span className="font-display text-base font-bold leading-none">{health}</span>
                    <span className="block w-full truncate text-[0.62rem] font-semibold text-fg/85">
                      {client.storeName}
                    </span>
                    {!client.online && (
                      <span className="absolute right-1 top-1 h-1.5 w-1.5 animate-pulse rounded-full bg-danger" />
                    )}
                  </a>
                );
              })}
              {withHealth.length === 0 && (
                <div className="col-span-full rounded-xl border border-dashed border-border bg-surface-2/30 p-6 text-center text-[0.78rem] text-muted">
                  Cadastre o primeiro cliente para popular a matriz.
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border/60 pt-3 text-[0.66rem] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-success" /> Saudavel (80+)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-warning" /> Atencao (60-79)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-danger" /> Critico (&lt;60)
              </span>
            </div>
          </div>
        </section>

        {/* ╔══════════════════════════════════════════════════════════════╗
            SPOTLIGHT - top performer & precisa de atencao
            ╚══════════════════════════════════════════════════════════════╝ */}
        {clients.length > 0 && (
          <section className="grid gap-4 md:grid-cols-2">
            {topPerformer && (
              <div className="relative overflow-hidden rounded-2xl border border-success/30 bg-gradient-to-br from-success-soft/60 via-surface to-surface p-5 shadow-soft">
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full"
                  style={{ background: "radial-gradient(circle, rgb(38 159 113 / 0.18) 0%, transparent 70%)" }}
                />
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-success/15 text-success">
                      <Trophy size={16} />
                    </span>
                    <div>
                      <span className="text-[0.6rem] font-bold uppercase tracking-widest text-success">Top performer da semana</span>
                      <h3 className="font-display text-lg font-bold tracking-tight text-fg">{topPerformer.storeName}</h3>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-border bg-surface/60 p-2.5">
                      <p className="text-[0.58rem] font-bold uppercase tracking-widest text-subtle">Vendas 7d</p>
                      <strong className="mt-0.5 block font-display text-lg font-bold text-success">{topPerformer.salesLast7}</strong>
                    </div>
                    <div className="rounded-lg border border-border bg-surface/60 p-2.5">
                      <p className="text-[0.58rem] font-bold uppercase tracking-widest text-subtle">Saude</p>
                      <strong className="mt-0.5 block font-display text-lg font-bold text-fg">{healthByKey.get(topPerformer.key) ?? 0}</strong>
                    </div>
                    <div className="rounded-lg border border-border bg-surface/60 p-2.5">
                      <p className="text-[0.58rem] font-bold uppercase tracking-widest text-subtle">Plano</p>
                      <strong className="mt-0.5 block font-display text-sm font-bold text-fg">{PLAN_LABEL[topPerformer.plan]}</strong>
                    </div>
                  </div>
                  <a href={`#c-${topPerformer.key}`} className="mt-3 inline-flex items-center gap-1 text-[0.74rem] font-bold text-success hover:underline">
                    Ver detalhes <ArrowUpRight size={12} />
                  </a>
                </div>
              </div>
            )}
            {worstClient && worstClient.health < 80 && (
              <div className="relative overflow-hidden rounded-2xl border border-danger/30 bg-gradient-to-br from-danger-soft/60 via-surface to-surface p-5 shadow-soft">
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full"
                  style={{ background: "radial-gradient(circle, rgb(224 84 78 / 0.18) 0%, transparent 70%)" }}
                />
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-danger/15 text-danger">
                      <AlertTriangle size={16} />
                    </span>
                    <div>
                      <span className="text-[0.6rem] font-bold uppercase tracking-widest text-danger">Precisa de atencao</span>
                      <h3 className="font-display text-lg font-bold tracking-tight text-fg">{worstClient.client.storeName}</h3>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-border bg-surface/60 p-2.5">
                      <p className="text-[0.58rem] font-bold uppercase tracking-widest text-subtle">Saude</p>
                      <strong className="mt-0.5 block font-display text-lg font-bold text-danger">{worstClient.health}</strong>
                    </div>
                    <div className="rounded-lg border border-border bg-surface/60 p-2.5">
                      <p className="text-[0.58rem] font-bold uppercase tracking-widest text-subtle">Alertas</p>
                      <strong className="mt-0.5 block font-display text-lg font-bold text-danger">{worstClient.client.alertCount}</strong>
                    </div>
                    <div className="rounded-lg border border-border bg-surface/60 p-2.5">
                      <p className="text-[0.58rem] font-bold uppercase tracking-widest text-subtle">Ultima venda</p>
                      <strong className="mt-0.5 block font-display text-xs font-bold text-fg">{worstClient.client.lastSaleAgo ?? "Nunca"}</strong>
                    </div>
                  </div>
                  <a href={`#c-${worstClient.client.key}`} className="mt-3 inline-flex items-center gap-1 text-[0.74rem] font-bold text-danger hover:underline">
                    Agir agora <ArrowUpRight size={12} />
                  </a>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ╔══════════════════════════════════════════════════════════════╗
            CLIENT GRID
            ╚══════════════════════════════════════════════════════════════╝ */}
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                <Users size={18} />
              </span>
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight text-fg">Clientes da operacao</h2>
                <p className="text-[0.75rem] text-muted">
                  {sorted.length} de {clients.length} cliente{clients.length !== 1 ? "s" : ""} exibido{clients.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          <form className="mb-4 grid gap-3 rounded-xl border border-border bg-surface-2/30 p-3 md:grid-cols-[1fr_160px_160px_auto] md:items-end">
            <label className="label">
              Buscar
              <span className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                <input className="field h-9 pl-9 text-sm" name="q" defaultValue={q ?? ""} placeholder="Nome, loja ou chave" />
              </span>
            </label>
            <label className="label">
              Status
              <select className="field h-9 text-sm" name="status" defaultValue={status ?? "ALL"}>
                <option value="ALL">Todos</option>
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="label">
              Plano
              <select className="field h-9 text-sm" name="plan" defaultValue={plan ?? "ALL"}>
                <option value="ALL">Todos</option>
                {Object.entries(PLAN_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <button className="button-primary h-9 px-4 py-0 text-sm">Filtrar</button>
          </form>

          {clients.length === 0 ? (
            <div className="grid place-items-center rounded-xl border border-dashed border-border bg-surface-2/30 p-10 text-center">
              <div>
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <Building2 size={24} strokeWidth={2.1} />
                </span>
                <p className="mt-4 font-display text-lg font-semibold tracking-tight text-fg">Nenhum cliente cadastrado</p>
                <p className="mt-2 max-w-sm text-[0.86rem] text-muted">Use o botao Novo cliente para montar sua grade master.</p>
              </div>
            </div>
          ) : sorted.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface-2/30 p-8 text-center text-muted">
              Nenhum cliente encontrado com os filtros atuais.
            </div>
          ) : (
            <div className="grid gap-3 2xl:grid-cols-2">
              {sorted.map((c) => {
                const db = dbByKey.get(c.key);
                return (
                  <ClientCard
                    key={c.key}
                    client={c}
                    dbClient={db}
                    mrr={mrr}
                    health={healthByKey.get(c.key) ?? 0}
                    taskCount={db ? taskCounts.get(db.id) : undefined}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* ╔══════════════════════════════════════════════════════════════╗
            FINANCIAL CALENDAR - all renewals
            ╚══════════════════════════════════════════════════════════════╝ */}
        {allRenewals.length > 0 && (
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
                  <CalendarClock size={18} />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold tracking-tight text-fg">Calendario de renovacoes</h2>
                  <p className="text-[0.75rem] text-muted">Ordem cronologica das proximas cobrancas</p>
                </div>
              </div>
              <div className="rounded-xl border border-accent/25 bg-accent-soft/40 px-3 py-1.5 text-right">
                <p className="text-[0.6rem] font-bold uppercase tracking-widest text-accent">Total mensal</p>
                <strong className="font-display text-sm font-bold text-fg">{money(mrr)}</strong>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {allRenewals.map(({ client, daysUntil }) => {
                const fee = Number(client.monthlyFee ?? 0);
                const urgent = daysUntil <= 3;
                const soon = daysUntil <= 7;
                return (
                  <div
                    key={client.id}
                    className={`flex items-center gap-3 rounded-xl border p-3 transition hover:-translate-y-0.5 ${
                      urgent ? "border-danger/30 bg-danger-soft/30" : soon ? "border-warning/30 bg-warning-soft/30" : "border-border bg-surface-2/30"
                    }`}
                  >
                    <div
                      className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg text-center ${
                        urgent ? "bg-danger text-white" : soon ? "bg-warning text-white" : "bg-surface text-fg border border-border"
                      }`}
                    >
                      <span className="text-[0.55rem] font-bold uppercase tracking-widest opacity-80">Dia</span>
                      <strong className="font-display text-base font-bold leading-none">{client.renewalDay}</strong>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm font-bold text-fg">{client.storeName ?? client.name}</p>
                      <p className="text-[0.7rem] text-muted">
                        {daysUntil === 0 ? "hoje" : daysUntil === 1 ? "amanha" : `em ${daysUntil} dias`} &middot; {PLAN_LABEL[client.plan]}
                      </p>
                    </div>
                    <strong className="shrink-0 font-display text-sm font-bold text-fg">{money(fee)}</strong>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <footer className="pb-4 pt-2 text-center text-[0.7rem] text-subtle">
          Painel master &middot; ultima atualizacao{" "}
          {new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date())}
        </footer>
      </div>
    </div>
  );
}
