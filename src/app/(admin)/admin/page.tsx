import { connection } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  Info,
  Package,
  Pencil,
  Search,
  ShieldAlert,
  ShoppingBag,
  Trash2,
  Users,
  WifiOff,
  XCircle
} from "lucide-react";
import { AdminClientPlan, AdminClientStatus } from "@prisma/client";
import { fetchAllClients, ClientSnapshot, Alert } from "@/lib/admin-clients";
import { prisma } from "@/lib/prisma";
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
      {online && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${online ? "bg-success" : "bg-danger"}`} />
    </span>
  );
}

function AlertRow({ alert }: { alert: Alert }) {
  const cfg = {
    critical: { cls: "text-danger", icon: <XCircle size={12} className="shrink-0" /> },
    warning: { cls: "text-warning", icon: <AlertTriangle size={12} className="shrink-0" /> },
    info: { cls: "text-primary", icon: <Info size={12} className="shrink-0" /> }
  }[alert.level];

  return (
    <li className={`flex items-start gap-2 text-[0.78rem] font-medium ${cfg.cls}`}>
      {cfg.icon}
      <span>{alert.message}</span>
    </li>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="min-w-[7rem] flex-1 rounded-xl border border-border bg-surface px-3 py-2">
      <span className="text-[0.64rem] font-semibold uppercase tracking-widest text-subtle">{label}</span>
      <strong className="mt-1 block font-display text-[1.05rem] font-semibold leading-none tracking-tight text-fg">{value}</strong>
      {sub && <span className="mt-1 block text-[0.68rem] text-muted">{sub}</span>}
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
  tone = "neutral",
  sub
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "primary";
  sub?: string;
}) {
  const toneClass = {
    neutral: "border-border bg-surface-2/60 text-muted",
    success: "border-success/20 bg-success-soft text-success",
    warning: "border-warning/20 bg-warning-soft text-warning",
    danger: "border-danger/20 bg-danger-soft text-danger",
    primary: "border-primary/20 bg-primary-soft text-primary"
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface/70 text-current">{icon}</span>
        <strong className="font-display text-2xl font-semibold tracking-tight text-fg">{value}</strong>
      </div>
      <p className="mt-3 text-[0.72rem] font-semibold uppercase tracking-widest">{label}</p>
      {sub && <p className="mt-1 text-[0.74rem] font-medium opacity-80">{sub}</p>}
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
      <label className="label">
        Nome da loja
        <input className="field" name="storeName" defaultValue={client?.storeName ?? ""} placeholder="Nome exibido no card" />
      </label>
      <label className="label">
        URL do sistema
        <input className="field" name="appUrl" defaultValue={client?.appUrl ?? ""} placeholder="https://cliente.up.railway.app" />
      </label>
      <label className="label">
        DATABASE_URL do cliente
        <textarea className="field min-h-20 font-mono text-xs" name="databaseUrl" defaultValue={client?.databaseUrl ?? ""} required />
      </label>
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
        Observacoes internas
        <textarea className="field min-h-20" name="notes" defaultValue={client?.notes ?? ""} />
      </label>
      <button className="button-primary">{client ? "Salvar cliente" : "Cadastrar cliente"}</button>
    </form>
  );
}

function ClientCard({
  client,
  dbClient
}: {
  client: ClientSnapshot;
  dbClient?: Awaited<ReturnType<typeof prisma.adminClient.findMany>>[number];
}) {
  const criticalAlerts = client.alerts.filter((a) => a.level === "critical");
  const hasCritical = criticalAlerts.length > 0 || !client.online || client.status === "SUSPENDED";
  const allClear = client.online && client.alerts.length === 0 && client.status === "ACTIVE";

  return (
    <article className={`rounded-2xl border bg-surface-2/40 p-4 transition ${hasCritical ? "border-danger/35 bg-danger-soft/5" : "border-border"}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <StatusDot online={client.online} />
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold leading-tight text-fg">{client.storeName}</p>
              <p className="truncate text-[0.76rem] text-muted">{client.name} · {client.key}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`status-pill ${client.status === "ACTIVE" ? "" : client.status === "SUSPENDED" || client.status === "CANCELED" ? "pill-danger" : "pill-warning"}`}>
              {STATUS_LABEL[client.status]}
            </span>
            <span className="status-pill pill-primary">{PLAN_LABEL[client.plan]}</span>
            {client.monthlyFee ? <span className="chip">{money(client.monthlyFee)}/mes</span> : null}
            <span className={client.source === "database" ? "chip" : "chip pill-warning"}>{client.source === "database" ? "CRM master" : "env"}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
          {client.appUrl ? (
            <a href={client.appUrl} target="_blank" rel="noreferrer" className="button-secondary h-9 px-3 py-0 text-xs">
              <ExternalLink size={13} /> Abrir
            </a>
          ) : null}
          {dbClient ? (
            <details className="group relative">
              <summary className="button-secondary h-9 cursor-pointer list-none px-3 py-0 text-xs">
                <Pencil size={13} /> Editar
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-[min(92vw,34rem)] rounded-2xl border border-border bg-elevated p-4 shadow-elev">
                <ClientForm action={updateAdminClientAction} client={dbClient} />
              </div>
            </details>
          ) : null}
        </div>
      </div>

      {!client.online && (
        <div className="mt-3 rounded-xl border border-danger/20 bg-danger-soft px-3 py-2 text-[0.78rem] font-medium text-danger">
          {client.error ?? "Cliente offline ou banco inacessivel."}
        </div>
      )}

      {client.alerts.length > 0 && (
        <ul className="mt-3 grid gap-1.5 border-t border-border/60 pt-3">
          {client.alerts.map((a, i) => <AlertRow key={i} alert={a} />)}
        </ul>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Ultima venda" value={client.lastSaleAgo ?? "Nunca"} />
        <Stat label="Vendas 7d" value={client.salesLast7} sub={`${client.salesLast30} em 30 dias`} />
        <Stat label="Usuarios" value={`${client.activeUsers}/${client.totalUsers}`} sub="ativos / total" />
        <Stat label="Catalogo" value={client.totalProducts} sub={client.productsWithoutVariants ? `${client.productsWithoutVariants} incompletos` : "produtos"} />
        <Stat label="Clientes" value={client.totalCustomers} sub={`+${client.newCustomersLast30} em 30 dias`} />
      </div>

      {dbClient ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-3">
          {(["ACTIVE", "SUSPENDED", "CANCELED"] as AdminClientStatus[]).map((status) => (
            <form key={status} action={setAdminClientStatusAction}>
              <input type="hidden" name="id" value={dbClient.id} />
              <input type="hidden" name="status" value={status} />
              <button className="button-secondary h-8 px-3 py-0 text-xs">{STATUS_LABEL[status]}</button>
            </form>
          ))}
          <form action={deleteAdminClientAction}>
            <input type="hidden" name="id" value={dbClient.id} />
            <button className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-danger/25 bg-danger-soft px-3 text-xs font-semibold text-danger">
              <Trash2 size={12} /> Remover
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

  const dbByKey = new Map(dbClients.map((client) => [client.key, client]));
  const normalizedQuery = q?.trim().toLowerCase() ?? "";
  const filtered = clients.filter((client) => {
    const matchesQuery = !normalizedQuery || [client.name, client.storeName, client.key].join(" ").toLowerCase().includes(normalizedQuery);
    const matchesStatus = !status || status === "ALL" || client.status === status;
    const matchesPlan = !plan || plan === "ALL" || client.plan === plan;
    return matchesQuery && matchesStatus && matchesPlan;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!a.online && b.online) return -1;
    if (a.online && !b.online) return 1;
    return b.alertCount - a.alertCount;
  });

  const onlineCount = clients.filter((c) => c.online).length;
  const totalAlerts = clients.reduce((sum, client) => sum + client.alertCount, 0);
  const criticalCount = clients.reduce((sum, client) => sum + client.alerts.filter((a) => a.level === "critical").length, 0);
  const totalSales7 = clients.reduce((sum, client) => sum + client.salesLast7, 0);
  const totalCustomers = clients.reduce((sum, client) => sum + client.totalCustomers, 0);
  const mrr = dbClients.reduce((sum, client) => sum + Number(client.monthlyFee ?? 0), 0);
  const activeClients = clients.filter((c) => c.status === "ACTIVE").length;

  return (
    <div className="min-h-dvh bg-surface p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-widest text-subtle">Painel Master</p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-fg md:text-4xl">
              Central de <span className="text-gradient">operacao</span>
            </h1>
            <p className="mt-2 max-w-2xl text-[0.9rem] text-muted">
              Controle clientes, planos, saude operacional, alertas e crescimento em uma tela unica.
            </p>
          </div>
          <form action="/api/admin/logout" method="POST">
            <button type="submit" className="rounded-xl border border-border bg-surface-2 px-4 py-2 text-[0.82rem] text-muted transition hover:text-danger">
              Sair
            </button>
          </form>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Kpi label="Clientes ativos" value={`${activeClients}/${clients.length}`} icon={<Users size={18} />} tone={activeClients === clients.length ? "success" : "warning"} />
          <Kpi label="Online agora" value={`${onlineCount}/${clients.length}`} icon={<Activity size={18} />} tone={onlineCount === clients.length ? "success" : "danger"} />
          <Kpi label="Alertas" value={totalAlerts} icon={criticalCount ? <XCircle size={18} /> : <CheckCircle2 size={18} />} tone={criticalCount ? "danger" : totalAlerts ? "warning" : "success"} sub={criticalCount ? `${criticalCount} criticos` : undefined} />
          <Kpi label="MRR cadastrado" value={money(mrr)} icon={<CircleDollarSign size={18} />} tone="primary" />
          <Kpi label="Uso agregado" value={totalSales7} icon={<ShoppingBag size={18} />} tone="neutral" sub={`${totalCustomers} clientes finais`} />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[360px_1fr]">
          <aside className="grid content-start gap-4">
            <div className="surface-card grid gap-4 p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Building2 size={18} />
                </span>
                <div>
                  <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Novo cliente</h2>
                  <p className="text-[0.76rem] text-muted">Cadastre conexao, plano e status.</p>
                </div>
              </div>
              <ClientForm action={createAdminClientAction} />
              <div className="rounded-xl border border-warning/25 bg-warning-soft px-3 py-2 text-[0.75rem] text-warning">
                <div className="flex gap-2">
                  <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                  <span>Guarde DATABASE_URL apenas de clientes que voce administra. O proximo passo recomendado e criptografar esse campo.</span>
                </div>
              </div>
            </div>
          </aside>

          <main className="grid content-start gap-4">
            <form className="surface-card grid gap-3 p-4 md:grid-cols-[1fr_180px_180px_auto] md:items-end">
              <label className="label">
                Buscar
                <span className="relative">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                  <input className="field pl-9" name="q" defaultValue={q ?? ""} placeholder="Nome, loja ou chave" />
                </span>
              </label>
              <label className="label">
                Status
                <select className="field" name="status" defaultValue={status ?? "ALL"}>
                  <option value="ALL">Todos</option>
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="label">
                Plano
                <select className="field" name="plan" defaultValue={plan ?? "ALL"}>
                  <option value="ALL">Todos</option>
                  {Object.entries(PLAN_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <button className="button-primary h-11 px-4 py-0">Filtrar</button>
            </form>

            {clients.length === 0 ? (
              <div className="grid place-items-center gap-4 rounded-2xl border border-dashed border-border bg-surface-2/30 p-12 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <Building2 size={24} strokeWidth={2.1} />
                </span>
                <div>
                  <p className="font-display text-lg font-semibold tracking-tight text-fg">Nenhum cliente cadastrado</p>
                  <p className="mt-2 max-w-sm text-[0.86rem] text-muted">
                    Use o formulario ao lado para criar sua grade master.
                  </p>
                </div>
              </div>
            ) : sorted.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">
                Nenhum cliente encontrado com os filtros atuais.
              </div>
            ) : (
              <div className="grid gap-3">
                {sorted.map((client) => (
                  <ClientCard key={client.key} client={client} dbClient={dbByKey.get(client.key)} />
                ))}
              </div>
            )}
          </main>
        </section>
      </div>
    </div>
  );
}
