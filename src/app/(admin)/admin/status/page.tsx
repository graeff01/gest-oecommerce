import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Database, ExternalLink, Server, ShieldAlert, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, getAdminSessionFromToken } from "@/lib/admin-auth";
import { fetchAllClients } from "@/lib/admin-clients";
import { getLatestBackupByClient } from "@/lib/admin-backups";
import { checkAppUrl, getLatestMigration } from "@/lib/admin-status";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function fmtDate(date: Date | null | undefined) {
  if (!date) return "Nunca";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.68rem] font-bold ${ok ? "border-success/25 bg-success-soft text-success" : "border-danger/25 bg-danger-soft text-danger"}`}>
      {ok ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
      {label}
    </span>
  );
}

export default async function AdminStatusPage() {
  const cookieStore = await cookies();
  const session = getAdminSessionFromToken(cookieStore.get(ADMIN_COOKIE)?.value);
  if (!session) redirect("/admin/login");

  const [clients, dbClients, backups] = await Promise.all([
    fetchAllClients(),
    prisma.adminClient.findMany({ orderBy: { name: "asc" } }).catch(() => []),
    getLatestBackupByClient()
  ]);

  const rows = await Promise.all(dbClients.map(async (client) => {
    const snap = clients.find((item) => item.key === client.key);
    const [app, migration] = await Promise.all([
      checkAppUrl(client.appUrl),
      getLatestMigration(client.databaseUrl)
    ]);
    return { client, snap, app, migration, backup: backups.get(client.id) };
  }));

  return (
    <div className="min-h-full p-4 md:p-6 xl:p-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
          <Link href="/admin" className="mb-3 inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3 py-1.5 text-[0.78rem] font-semibold text-muted transition hover:text-primary">
            <ArrowLeft size={13} /> Voltar
          </Link>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
              <Server size={20} />
            </span>
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-widest text-subtle">Operacao</p>
              <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Status dos clientes</h1>
              <p className="mt-1 text-[0.84rem] text-muted">App online, banco online, backup, migration e versao operacional.</p>
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
          <div className="grid grid-cols-[1.2fr_120px_120px_1fr_1fr_150px] gap-3 border-b border-border bg-surface-2/60 px-4 py-3 text-[0.66rem] font-bold uppercase tracking-widest text-subtle">
            <span>Cliente</span>
            <span>App</span>
            <span>Banco</span>
            <span>Ultimo backup</span>
            <span>Migration</span>
            <span>Acoes</span>
          </div>
          {rows.map(({ client, snap, app, migration, backup }) => {
            const backupOk = backup?.status === "SUCCESS";
            return (
              <div key={client.id} className="grid grid-cols-[1.2fr_120px_120px_1fr_1fr_150px] gap-3 border-b border-border/60 px-4 py-3 text-[0.8rem] last:border-b-0">
                <div className="min-w-0">
                  <p className="truncate font-bold text-fg">{client.storeName ?? client.name}</p>
                  <p className="truncate text-[0.7rem] text-muted">{client.key}</p>
                </div>
                <div><StatusPill ok={app.ok} label={app.ok ? "online" : "falha"} /></div>
                <div><StatusPill ok={Boolean(snap?.online)} label={snap?.online ? "online" : "falha"} /></div>
                <div className="min-w-0">
                  <p className={backupOk ? "font-semibold text-success" : "font-semibold text-warning"}>{backup?.status ?? "PENDENTE"}</p>
                  <p className="truncate text-[0.7rem] text-muted">{fmtDate(backup?.finishedAt ?? backup?.startedAt)}</p>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-mono text-[0.7rem] text-fg">{migration?.migration_name ?? "desconhecida"}</p>
                  <p className="text-[0.7rem] text-muted">{fmtDate(migration?.finished_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/admin/client/${client.key}`} className="button-secondary h-8 px-2.5 py-0 text-xs">
                    <Database size={12} /> Detalhes
                  </Link>
                  {client.appUrl ? (
                    <a href={client.appUrl} target="_blank" rel="noreferrer" className="button-secondary h-8 px-2.5 py-0 text-xs">
                      <ExternalLink size={12} />
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })}
          {rows.length === 0 ? (
            <div className="p-8 text-center text-muted">
              <ShieldAlert size={24} className="mx-auto mb-2 text-warning" />
              Nenhum cliente cadastrado no banco master.
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
