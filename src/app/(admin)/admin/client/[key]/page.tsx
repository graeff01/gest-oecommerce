import { connection } from "next/server";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Award,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Crown,
  ExternalLink,
  Info,
  Package,
  ShoppingBag,
  Users,
  XCircle
} from "lucide-react";
import type { AdminClientPlan, AdminClientStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchClientSnapshot } from "@/lib/admin-clients";
import { fetchClientDetail } from "@/lib/admin-client-detail";
import { getClientSnapshotHistory } from "@/lib/admin-snapshots";
import { getTasksForClient } from "@/lib/admin-tasks";
import { TaskList } from "@/components/admin/TaskList";
import { ContactQuickActions } from "@/components/admin/ContactQuickActions";
import { NotesEditor } from "@/components/admin/NotesEditor";
import { SalesChart, HealthHistoryChart } from "@/components/admin/SalesChart";
import { CaptureClientSnapshotButton } from "@/components/admin/CaptureSnapshotButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

const ORDER_STATUS_LABEL: Record<string, string> = {
  NEW: "Novo",
  PAID: "Pago",
  PICKING: "Separando",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELED: "Cancelado"
};

const ORDER_STATUS_COLOR: Record<string, string> = {
  NEW: "bg-sky-500/15 text-sky-600 border-sky-500/25",
  PAID: "bg-success/15 text-success border-success/25",
  PICKING: "bg-warning/15 text-warning border-warning/25",
  SHIPPED: "bg-primary/15 text-primary border-primary/25",
  DELIVERED: "bg-emerald-500/15 text-emerald-700 border-emerald-500/25",
  CANCELED: "bg-danger/15 text-danger border-danger/25"
};

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function calcHealth(opts: { online: boolean; status: AdminClientStatus; salesLast7: number; salesLast30: number; criticalCount: number; warningCount: number }): number {
  let score = 0;
  if (opts.online) score += 30;
  if (opts.status === "ACTIVE") score += 20;
  if (opts.salesLast7 >= 5) score += 25;
  else if (opts.salesLast7 > 0) score += 18;
  else if (opts.salesLast30 > 0) score += 8;
  if (opts.criticalCount === 0) score += 15;
  else score -= opts.criticalCount * 5;
  if (opts.warningCount === 0) score += 10;
  else score -= opts.warningCount * 2;
  return Math.max(0, Math.min(100, score));
}

export default async function ClientDetailPage({
  params
}: {
  params: Promise<{ key: string }>;
}) {
  await connection();

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret || token !== adminSecret) {
    redirect("/admin/login");
  }

  const { key } = await params;
  let client;
  try {
    client = await prisma.adminClient.findUnique({ where: { key } });
  } catch (err) {
    // Most common cause: migration `20260516000001_admin_crm_tasks_snapshots`
    // not yet applied (contactName / contactPhone / contactEmail columns absent).
    return (
      <div className="min-h-full">
        <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-[0.78rem] font-semibold text-muted transition hover:text-primary"
          >
            <ArrowLeft size={13} /> Voltar
          </Link>
          <div className="rounded-2xl border border-danger/30 bg-danger-soft/30 p-6 shadow-soft">
            <div className="mb-3 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-danger/15 text-danger">
                <AlertTriangle size={18} />
              </span>
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight text-fg">
                  Banco do painel master desatualizado
                </h2>
                <p className="text-[0.78rem] text-muted">
                  A consulta de cliente falhou ao acessar colunas/tabelas novas.
                </p>
              </div>
            </div>
            <p className="mb-3 text-[0.86rem] text-fg/85">
              Aplique a migration pendente no banco do <strong>painel master</strong> (nao no banco do cliente):
            </p>
            <pre className="overflow-x-auto rounded-xl border border-border bg-surface-2/40 p-3 text-[0.76rem] font-mono text-fg">
{`# No servidor (Railway shell ou local com DATABASE_URL apontando pra prod):
npx prisma migrate deploy`}
            </pre>
            <p className="mt-3 text-[0.78rem] text-muted">
              Migration esperada: <code className="font-mono text-fg">20260516000001_admin_crm_tasks_snapshots</code>
            </p>
            <details className="mt-3 text-[0.74rem] text-muted">
              <summary className="cursor-pointer font-semibold">Detalhes tecnicos</summary>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-surface-2/40 p-2 font-mono text-[0.72rem]">
                {err instanceof Error ? err.message : String(err)}
              </pre>
            </details>
          </div>
        </div>
      </div>
    );
  }
  if (!client) notFound();

  const [snap, detail, history, tasks] = await Promise.all([
    fetchClientSnapshot({
      id: client.id,
      key: client.key,
      name: client.name,
      storeName: client.storeName,
      appUrl: client.appUrl,
      url: client.databaseUrl,
      status: client.status,
      plan: client.plan,
      monthlyFee: client.monthlyFee === null ? null : Number(client.monthlyFee),
      renewalDay: client.renewalDay,
      notes: client.notes,
      source: "database"
    }),
    fetchClientDetail(client.databaseUrl),
    getClientSnapshotHistory(client.id, 30).catch(() => []),
    getTasksForClient(client.id)
  ]);

  const criticalCount = snap.alerts.filter((a) => a.level === "critical").length;
  const warningCount = snap.alerts.filter((a) => a.level === "warning").length;
  const health = calcHealth({
    online: snap.online,
    status: snap.status,
    salesLast7: snap.salesLast7,
    salesLast30: snap.salesLast30,
    criticalCount,
    warningCount
  });

  const taskDtos = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    done: t.done,
    priority: t.priority,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null
  }));

  const healthColor = health >= 80 ? "rgb(38 159 113)" : health >= 60 ? "rgb(218 156 64)" : "rgb(224 84 78)";
  const healthBg = health >= 80 ? "rgb(38 159 113 / 0.12)" : health >= 60 ? "rgb(218 156 64 / 0.12)" : "rgb(224 84 78 / 0.12)";

  return (
    <div className="min-h-full">
      <div className="space-y-4 p-4 md:p-6 xl:p-8 2xl:p-10">

        {/* ── BREADCRUMB + HEADER ──────────────────────────────────── */}
        <div className="flex items-center gap-3 text-[0.78rem]">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 font-semibold text-muted transition hover:text-primary"
          >
            <ArrowLeft size={13} /> Voltar
          </Link>
          <span className="text-subtle">/</span>
          <span className="font-semibold text-fg">{snap.storeName}</span>
        </div>

        {/* ── HERO ─────────────────────────────────────────────────── */}
        <header
          className="relative overflow-hidden rounded-2xl border border-indigo-900/40 shadow-2xl"
          style={{ background: "linear-gradient(135deg, #07061a 0%, #14103a 35%, #1d1456 60%, #0e0a2a 100%)" }}
        >
          <div
            className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full"
            style={{ background: "radial-gradient(circle, rgb(99 80 240 / 0.32) 0%, transparent 70%)" }}
          />
          <div
            className="pointer-events-none absolute -right-10 top-10 h-48 w-48 rounded-full"
            style={{ background: `radial-gradient(circle, ${healthColor} 0%, transparent 70%)`, opacity: 0.2 }}
          />

          <div className="relative grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:gap-8 lg:p-8">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.65rem] font-bold uppercase tracking-widest"
                  style={{
                    borderColor: snap.online ? "rgb(80 200 152 / 0.4)" : "rgb(248 116 112 / 0.4)",
                    background: snap.online ? "rgb(80 200 152 / 0.1)" : "rgb(248 116 112 / 0.1)",
                    color: snap.online ? "rgb(120 220 175)" : "rgb(252 140 135)"
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 animate-pulse rounded-full"
                    style={{ background: snap.online ? "rgb(120 220 175)" : "rgb(252 140 135)" }}
                  />
                  {snap.online ? "Online" : "Offline"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[0.66rem] font-semibold text-white/70">
                  {STATUS_LABEL[snap.status]}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-1 text-[0.66rem] font-semibold text-accent">
                  <Crown size={11} /> {PLAN_LABEL[snap.plan]}
                </span>
              </div>

              <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white md:text-4xl">{snap.storeName}</h1>
              <p className="mt-1 text-[0.84rem] text-white/55">
                {client.name} &middot; <span className="font-mono">{client.key}</span>
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {snap.appUrl && (
                  <a
                    href={snap.appUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-[0.78rem] font-semibold text-white transition hover:bg-white/15"
                  >
                    <ExternalLink size={13} /> Abrir sistema
                  </a>
                )}
                <CaptureClientSnapshotButton clientId={client.id} />
              </div>
            </div>

            {/* Health ring big */}
            <div className="flex items-center gap-4">
              <div
                className="relative grid h-32 w-32 place-items-center rounded-full"
                style={{ background: `conic-gradient(${healthColor} ${health * 3.6}deg, ${healthBg} 0deg)` }}
              >
                <div className="absolute grid h-[110px] w-[110px] place-items-center rounded-full bg-[#0e0a2a] text-white">
                  <div className="text-center">
                    <strong className="block font-display text-3xl font-bold leading-none">{health}</strong>
                    <span className="mt-1 block text-[0.6rem] font-bold uppercase tracking-widest text-white/60">Saude</span>
                  </div>
                </div>
              </div>
              <div className="hidden md:block">
                <p className="text-[0.62rem] font-bold uppercase tracking-widest text-white/40">Estado</p>
                <p className="mt-1 font-display text-base font-bold text-white">
                  {health >= 80 ? "Saudavel" : health >= 60 ? "Atencao" : "Critico"}
                </p>
                {client.monthlyFee && (
                  <>
                    <p className="mt-3 text-[0.62rem] font-bold uppercase tracking-widest text-white/40">Mensalidade</p>
                    <p className="mt-1 font-display text-base font-bold text-white">{money(Number(client.monthlyFee))}</p>
                  </>
                )}
                {client.renewalDay && (
                  <p className="mt-1 text-[0.7rem] text-white/60">renova dia {client.renewalDay}</p>
                )}
              </div>
            </div>
          </div>
        </header>

        {detail.ok === false ? (
          <div className="rounded-2xl border border-danger/30 bg-danger-soft/40 p-6 text-center">
            <AlertTriangle size={28} className="mx-auto mb-2 text-danger" />
            <p className="font-display text-lg font-bold text-fg">Nao conseguimos acessar o banco do cliente</p>
            <p className="mt-1 text-[0.84rem] text-muted">{detail.error}</p>
          </div>
        ) : (
          <>
            {/* ── KPIs ────────────────────────────────────────────────── */}
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              <KpiTile
                label="Receita 30d"
                value={money(detail.revenue30)}
                sub={`${money(detail.revenue7)} nos ultimos 7d`}
                icon={<CircleDollarSign size={16} />}
                tone="success"
              />
              <KpiTile
                label="Ticket medio"
                value={money(detail.averageTicket)}
                sub={`${snap.salesLast30} pedidos`}
                icon={<Award size={16} />}
                tone="primary"
              />
              <KpiTile
                label="Vendas 7d"
                value={snap.salesLast7}
                sub={`${snap.salesLast30} em 30d`}
                icon={<ShoppingBag size={16} />}
                tone={snap.salesLast7 > 0 ? "success" : "warning"}
              />
              <KpiTile
                label="Clientes finais"
                value={snap.totalCustomers.toLocaleString("pt-BR")}
                sub={`+${snap.newCustomersLast30} em 30d`}
                icon={<Users size={16} />}
                tone="primary"
              />
              <KpiTile
                label="Catalogo"
                value={snap.totalProducts}
                sub={detail.lowStockCount ? `${detail.lowStockCount} com estoque baixo` : "estoque ok"}
                icon={<Package size={16} />}
                tone={detail.lowStockCount > 0 ? "warning" : "neutral"}
              />
            </section>

            {/* ── SALES CHART + STATUS BREAKDOWN ──────────────────────── */}
            <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
              <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
                <SalesChart data={detail.salesByDay} metric="revenue" />
              </div>
              <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
                <div className="mb-3 flex items-center gap-2">
                  <Activity size={15} className="text-primary" />
                  <h3 className="font-display text-sm font-bold tracking-tight text-fg">Pedidos por status (30d)</h3>
                </div>
                {detail.ordersByStatus.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-surface-2/30 p-4 text-center text-[0.78rem] text-muted">
                    Nenhum pedido nos ultimos 30 dias.
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {detail.ordersByStatus.map((s) => {
                      const total = detail.ordersByStatus.reduce((sum, x) => sum + x.count, 0);
                      const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                      const cls = ORDER_STATUS_COLOR[s.status] ?? "bg-muted/15 text-muted border-muted/25";
                      return (
                        <div key={s.status} className="space-y-1">
                          <div className="flex items-center justify-between text-[0.74rem]">
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.66rem] font-bold ${cls}`}>
                              {ORDER_STATUS_LABEL[s.status] ?? s.status}
                            </span>
                            <strong className="text-fg">{s.count} <span className="text-muted font-normal">({pct}%)</span></strong>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-surface-3/40">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* ── ALERTS + HEALTH HISTORY ─────────────────────────────── */}
            <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
              <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={15} className={criticalCount ? "text-danger" : "text-muted"} />
                    <h3 className="font-display text-sm font-bold tracking-tight text-fg">Alertas e diagnostico</h3>
                  </div>
                  <span className="text-[0.66rem] text-muted">
                    {snap.alerts.length} item{snap.alerts.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {snap.alerts.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success-soft/50 p-3 text-[0.78rem] font-semibold text-success">
                    <CheckCircle2 size={13} /> Operacao saudavel, sem alertas
                  </div>
                ) : (
                  <ul className="grid gap-2">
                    {snap.alerts.map((a, i) => {
                      const cfg = {
                        critical: { cls: "border-danger/25 bg-danger-soft/40 text-danger", icon: <XCircle size={12} /> },
                        warning: { cls: "border-warning/25 bg-warning-soft/40 text-warning", icon: <AlertTriangle size={12} /> },
                        info: { cls: "border-primary/25 bg-primary-soft/40 text-primary", icon: <Info size={12} /> }
                      }[a.level];
                      return (
                        <li key={i} className={`flex items-start gap-2 rounded-xl border p-2.5 text-[0.78rem] font-medium ${cfg.cls}`}>
                          <span className="mt-0.5 shrink-0">{cfg.icon}</span>
                          <span>{a.message}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-sm font-bold tracking-tight text-fg">Evolucao da saude</h3>
                    <p className="text-[0.7rem] text-muted">
                      {history.length} snapshot{history.length !== 1 ? "s" : ""} nos ultimos 30 dias
                    </p>
                  </div>
                </div>
                <div className="h-24">
                  <HealthHistoryChart history={history.map((h) => ({ capturedAt: h.capturedAt, healthScore: h.healthScore }))} />
                </div>
                {history.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg border border-border bg-surface-2/30 p-2">
                      <p className="text-[0.58rem] font-bold uppercase tracking-widest text-subtle">Atual</p>
                      <strong className="block font-display text-base font-bold text-fg">{history[history.length - 1]?.healthScore ?? "-"}</strong>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-2/30 p-2">
                      <p className="text-[0.58rem] font-bold uppercase tracking-widest text-subtle">Media</p>
                      <strong className="block font-display text-base font-bold text-fg">
                        {Math.round(history.reduce((s, h) => s + h.healthScore, 0) / history.length)}
                      </strong>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-2/30 p-2">
                      <p className="text-[0.58rem] font-bold uppercase tracking-widest text-subtle">Variacao</p>
                      <strong
                        className={`block font-display text-base font-bold ${
                          history[history.length - 1].healthScore >= history[0].healthScore ? "text-success" : "text-danger"
                        }`}
                      >
                        {history[history.length - 1].healthScore - history[0].healthScore > 0 ? "+" : ""}
                        {history[history.length - 1].healthScore - history[0].healthScore}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ── ORDERS + PRODUCTS + CUSTOMERS ────────────────────────── */}
            <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
              {/* Recent orders */}
              <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
                <div className="mb-3 flex items-center gap-2">
                  <ShoppingBag size={15} className="text-primary" />
                  <h3 className="font-display text-sm font-bold tracking-tight text-fg">Ultimos pedidos</h3>
                </div>
                {detail.recentOrders.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-surface-2/30 p-4 text-center text-[0.78rem] text-muted">
                    Sem pedidos recentes.
                  </div>
                ) : (
                  <div className="grid gap-1.5">
                    {detail.recentOrders.map((o) => {
                      const cls = ORDER_STATUS_COLOR[o.status] ?? "bg-muted/15 text-muted border-muted/25";
                      return (
                        <div key={o.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/30 p-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[0.78rem] font-bold text-fg">{o.customer ?? "Cliente avulso"}</p>
                            <p className="text-[0.66rem] text-muted">
                              <span className="font-mono">{o.code}</span> &middot;{" "}
                              {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(o.createdAt)}
                            </p>
                          </div>
                          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.62rem] font-bold ${cls}`}>
                            {ORDER_STATUS_LABEL[o.status] ?? o.status}
                          </span>
                          <strong className="shrink-0 font-display text-sm font-bold text-fg">{money(o.total)}</strong>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Top products */}
              <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
                <div className="mb-3 flex items-center gap-2">
                  <Package size={15} className="text-accent" />
                  <h3 className="font-display text-sm font-bold tracking-tight text-fg">Top produtos (30d)</h3>
                </div>
                {detail.topProducts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-surface-2/30 p-4 text-center text-[0.78rem] text-muted">
                    Sem dados de produtos.
                  </div>
                ) : (
                  <ol className="grid gap-1.5">
                    {detail.topProducts.map((p, i) => (
                      <li key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/30 p-2.5">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent/15 text-[0.7rem] font-bold text-accent">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[0.78rem] font-bold text-fg">{p.name}</p>
                          <p className="truncate text-[0.66rem] text-muted">{p.category}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <strong className="block text-[0.76rem] font-bold text-fg">{p.totalSold} un</strong>
                          <p className="text-[0.64rem] text-muted">{money(p.revenue)}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* Top customers */}
              <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
                <div className="mb-3 flex items-center gap-2">
                  <Users size={15} className="text-emerald-600" />
                  <h3 className="font-display text-sm font-bold tracking-tight text-fg">Top clientes (30d)</h3>
                </div>
                {detail.topCustomers.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-surface-2/30 p-4 text-center text-[0.78rem] text-muted">
                    Sem dados de clientes.
                  </div>
                ) : (
                  <ol className="grid gap-1.5">
                    {detail.topCustomers.map((c, i) => (
                      <li key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/30 p-2.5">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-500/15 text-[0.7rem] font-bold text-emerald-700">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[0.78rem] font-bold text-fg">{c.name}</p>
                          <p className="text-[0.66rem] text-muted">{c.orderCount} pedido{c.orderCount > 1 ? "s" : ""}</p>
                        </div>
                        <strong className="shrink-0 font-display text-sm font-bold text-fg">{money(c.totalSpent)}</strong>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </section>
          </>
        )}

        {/* ── CONTACT + NOTES + TASKS ──────────────────────────────── */}
        <section className="grid gap-4 lg:grid-cols-3">
          <ContactQuickActions
            storeName={snap.storeName}
            contactName={client.contactName}
            contactPhone={client.contactPhone}
            contactEmail={client.contactEmail}
            monthlyFee={client.monthlyFee === null ? null : Number(client.monthlyFee)}
            renewalDay={client.renewalDay}
            variant="card"
          />
          <NotesEditor clientId={client.id} initial={client.notes} />
          <TaskList clientId={client.id} tasks={taskDtos} />
        </section>

        {/* ── METADATA ─────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
          <div className="mb-3 flex items-center gap-2">
            <Building2 size={15} className="text-muted" />
            <h3 className="font-display text-sm font-bold tracking-tight text-fg">Dados de cadastro</h3>
          </div>
          <dl className="grid gap-3 text-[0.78rem] sm:grid-cols-2 md:grid-cols-3">
            <div>
              <dt className="text-[0.6rem] font-bold uppercase tracking-widest text-subtle">Cadastrado em</dt>
              <dd className="mt-0.5 font-semibold text-fg">{new Intl.DateTimeFormat("pt-BR").format(client.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-[0.6rem] font-bold uppercase tracking-widest text-subtle">Ultima atualizacao</dt>
              <dd className="mt-0.5 font-semibold text-fg">{new Intl.DateTimeFormat("pt-BR").format(client.updatedAt)}</dd>
            </div>
            <div>
              <dt className="text-[0.6rem] font-bold uppercase tracking-widest text-subtle">Dia de renovacao</dt>
              <dd className="mt-0.5 font-semibold text-fg">
                {client.renewalDay ? `Dia ${client.renewalDay}` : <span className="text-muted">nao definido</span>}
              </dd>
            </div>
            <div>
              <dt className="text-[0.6rem] font-bold uppercase tracking-widest text-subtle">Mensalidade</dt>
              <dd className="mt-0.5 font-semibold text-fg">
                {client.monthlyFee ? money(Number(client.monthlyFee)) : <span className="text-muted">nao definida</span>}
              </dd>
            </div>
            <div>
              <dt className="text-[0.6rem] font-bold uppercase tracking-widest text-subtle">Plano</dt>
              <dd className="mt-0.5 font-semibold text-fg">{PLAN_LABEL[client.plan]}</dd>
            </div>
            <div>
              <dt className="text-[0.6rem] font-bold uppercase tracking-widest text-subtle">Status</dt>
              <dd className="mt-0.5 font-semibold text-fg">{STATUS_LABEL[client.status]}</dd>
            </div>
          </dl>
        </section>

        <footer className="flex items-center justify-center gap-2 pb-6 pt-2 text-center text-[0.7rem] text-subtle">
          <CalendarClock size={11} />
          Detalhes atualizados em {new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date())}
        </footer>
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  sub,
  icon,
  tone
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  tone: "neutral" | "success" | "warning" | "primary";
}) {
  const tones = {
    neutral: "border-border bg-surface text-muted",
    success: "border-success/25 bg-success-soft/40 text-success",
    warning: "border-warning/25 bg-warning-soft/40 text-warning",
    primary: "border-primary/25 bg-primary-soft/40 text-primary"
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 shadow-soft transition hover:-translate-y-0.5 ${tones}`}>
      <div className="flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface/70">{icon}</span>
      </div>
      <p className="mt-3 text-[0.6rem] font-bold uppercase tracking-widest text-muted">{label}</p>
      <strong className="mt-1 block font-display text-xl font-bold text-fg">{value}</strong>
      {sub && <p className="mt-0.5 text-[0.7rem] text-muted">{sub}</p>}
    </div>
  );
}
