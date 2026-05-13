import { connection } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AlertTriangle, Building2, CircleDollarSign, ShoppingBag, TrendingUp, Users, Wallet, WifiOff } from "lucide-react";
import { fetchAllClients, ClientSnapshot } from "@/lib/admin-clients";
import { money } from "@/lib/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from "@/lib/constants";

const ADMIN_COOKIE = "gestao_admin_session";

function StatBlock({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-surface-2/50 p-3">
      <p className="text-[0.65rem] font-medium uppercase tracking-wide text-subtle">{label}</p>
      <strong className="mt-1 block font-display text-lg font-semibold tracking-tight text-fg">{value}</strong>
      {sub && <p className="text-[0.72rem] text-muted">{sub}</p>}
    </div>
  );
}

function ClientCard({ client }: { client: ClientSnapshot }) {
  if (client.error) {
    return (
      <div className="surface-card grid gap-3 p-5 opacity-70">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-danger-soft text-danger">
            <WifiOff size={17} />
          </span>
          <div>
            <h2 className="font-display text-base font-semibold tracking-tight text-fg">{client.name}</h2>
            <p className="text-[0.74rem] text-danger">Erro de conexão</p>
          </div>
        </div>
        <p className="rounded-lg bg-danger-soft/50 p-3 text-[0.76rem] text-danger">{client.error}</p>
      </div>
    );
  }

  return (
    <div className="surface-card grid gap-5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-2 text-primary-fg shadow-glow">
            <Building2 size={17} strokeWidth={2.1} />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight text-fg">{client.storeName}</h2>
            <p className="text-[0.74rem] text-muted">{client.name}</p>
          </div>
        </div>
        {client.lowStockCount > 0 && (
          <span className="status-pill pill-danger flex items-center gap-1">
            <AlertTriangle size={11} />
            {client.lowStockCount} alertas
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <StatBlock label="Receita (mês)" value={money(client.totalRevenue)} />
        <StatBlock label="Gastos (mês)" value={money(client.totalExpenses)} />
        <StatBlock label="Lucro (mês)" value={money(client.profit)} sub={client.profit >= 0 ? "positivo" : "negativo"} />
        <StatBlock label="Pedidos (mês)" value={String(client.totalOrders)} />
        <StatBlock label="Clientes" value={String(client.totalCustomers)} />
        <StatBlock label="Produtos" value={String(client.totalProducts)} />
      </div>

      {client.openCrediario > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-warning-soft/60 px-4 py-2.5">
          <Wallet size={15} className="text-warning" />
          <span className="text-[0.82rem] font-medium text-fg">
            Crediário em aberto: <b className="text-warning">{money(client.openCrediario)}</b>
          </span>
        </div>
      )}

      {client.recentOrders.length > 0 && (
        <div>
          <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-wide text-muted">Últimos pedidos</p>
          <div className="table-shell overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Status</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {client.recentOrders.map((order) => (
                  <tr key={order.code}>
                    <td className="font-semibold text-fg">{order.code}</td>
                    <td className="text-muted">{order.customerName ?? "Avulsa"}</td>
                    <td>
                      <span className={ORDER_STATUS_TONES[order.status] ?? "status-pill"}>
                        {ORDER_STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="text-right font-semibold text-fg">{money(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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

  const totalRevenue = clients.reduce((s, c) => s + c.totalRevenue, 0);
  const totalProfit = clients.reduce((s, c) => s + c.profit, 0);
  const totalOrders = clients.reduce((s, c) => s + c.totalOrders, 0);
  const totalCustomers = clients.reduce((s, c) => s + c.totalCustomers, 0);

  return (
    <div className="min-h-dvh bg-surface p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="eyebrow">Painel Master</p>
            <h1 className="heading-display mt-1 text-2xl md:text-3xl">
              Visão <span className="text-gradient">consolidada</span>
            </h1>
            <p className="mt-1 text-[0.85rem] text-muted">Monitoramento read-only de todos os clientes.</p>
          </div>
          <form action="/api/admin/logout" method="POST">
            <button type="submit" className="rounded-xl border border-border bg-surface-2 px-4 py-2 text-sm text-muted transition hover:text-danger">
              Sair
            </button>
          </form>
        </header>

        <div className="grid gap-6">
          {clients.length > 1 && (
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="surface-card flex items-center gap-4 p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-success-soft text-success">
                  <TrendingUp size={20} strokeWidth={2.1} />
                </span>
                <div>
                  <p className="text-[0.74rem] font-medium uppercase tracking-wide text-subtle">Receita total (mês)</p>
                  <strong className="mt-0.5 block font-display text-xl font-semibold tracking-tight text-fg">{money(totalRevenue)}</strong>
                </div>
              </div>
              <div className="surface-card flex items-center gap-4 p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <CircleDollarSign size={20} strokeWidth={2.1} />
                </span>
                <div>
                  <p className="text-[0.74rem] font-medium uppercase tracking-wide text-subtle">Lucro total (mês)</p>
                  <strong className={`mt-0.5 block font-display text-xl font-semibold tracking-tight ${totalProfit >= 0 ? "text-success" : "text-danger"}`}>{money(totalProfit)}</strong>
                </div>
              </div>
              <div className="surface-card flex items-center gap-4 p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning">
                  <ShoppingBag size={20} strokeWidth={2.1} />
                </span>
                <div>
                  <p className="text-[0.74rem] font-medium uppercase tracking-wide text-subtle">Pedidos (mês)</p>
                  <strong className="mt-0.5 block font-display text-xl font-semibold tracking-tight text-fg">{totalOrders}</strong>
                </div>
              </div>
              <div className="surface-card flex items-center gap-4 p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-success-soft text-success">
                  <Users size={20} strokeWidth={2.1} />
                </span>
                <div>
                  <p className="text-[0.74rem] font-medium uppercase tracking-wide text-subtle">Clientes totais</p>
                  <strong className="mt-0.5 block font-display text-xl font-semibold tracking-tight text-fg">{totalCustomers}</strong>
                </div>
              </div>
            </section>
          )}

          {clients.length === 0 ? (
            <div className="grid place-items-center gap-4 rounded-2xl border border-dashed border-border bg-surface-2/30 p-16 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
                <Building2 size={24} strokeWidth={2.1} />
              </span>
              <div>
                <p className="font-display text-lg font-semibold tracking-tight text-fg">Nenhum cliente configurado</p>
                <p className="mt-2 max-w-sm text-[0.86rem] text-muted">
                  Configure a variável <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-fg">ADMIN_CLIENTS</code> com{" "}
                  <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-fg">{'[{"key":"la-wear","name":"LA WEAR","url":"postgres://..."}]'}</code>.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              {clients.map((client) => (
                <ClientCard key={client.key} client={client} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
