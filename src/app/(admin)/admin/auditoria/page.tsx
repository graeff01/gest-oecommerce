import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ScrollText, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, getAdminSessionFromToken } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatAction(action: string) {
  return action
    .replace(/^ADMIN_/, "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function formatMetadata(value: unknown) {
  if (!value) return "Sem metadados";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default async function AdminAuditPage() {
  const cookieStore = await cookies();
  const session = getAdminSessionFromToken(cookieStore.get(ADMIN_COOKIE)?.value);
  if (!session) redirect("/admin/login");

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 120,
    include: {
      user: { select: { name: true, email: true } }
    }
  }).catch(() => []);

  return (
    <div className="min-h-full p-4 md:p-6 xl:p-8">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <Link
                href="/admin"
                className="mb-3 inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3 py-1.5 text-[0.78rem] font-semibold text-muted transition hover:text-primary"
              >
                <ArrowLeft size={13} /> Voltar
              </Link>
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                  <ScrollText size={20} />
                </span>
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-widest text-subtle">Seguranca</p>
                  <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Auditoria do painel master</h1>
                  <p className="mt-1 text-[0.84rem] text-muted">Ultimas acoes sensiveis registradas no db-master.</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-success/20 bg-success-soft px-3 py-2 text-[0.78rem] font-semibold text-success">
              <ShieldCheck size={14} className="mr-1 inline" />
              Sessao: {session.email}
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
          <div className="grid grid-cols-[150px_1fr_160px_140px] gap-3 border-b border-border bg-surface-2/60 px-4 py-3 text-[0.68rem] font-bold uppercase tracking-widest text-subtle">
            <span>Quando</span>
            <span>Acao</span>
            <span>Entidade</span>
            <span>Usuario</span>
          </div>
          {logs.length === 0 ? (
            <div className="p-8 text-center text-[0.86rem] text-muted">
              Nenhum evento de auditoria registrado ainda.
            </div>
          ) : (
            <div className="max-h-[calc(100dvh-17rem)] overflow-y-auto">
              {logs.map((log) => (
                <details key={log.id} className="group border-b border-border/60 last:border-b-0">
                  <summary className="grid cursor-pointer grid-cols-[150px_1fr_160px_140px] gap-3 px-4 py-3 text-[0.82rem] transition hover:bg-surface-2/40">
                    <span className="text-muted">
                      {new Intl.DateTimeFormat("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit"
                      }).format(log.createdAt)}
                    </span>
                    <span className="font-semibold text-fg">{formatAction(log.action)}</span>
                    <span className="truncate text-muted">{log.entity}{log.entityId ? ` / ${log.entityId}` : ""}</span>
                    <span className="truncate text-muted">{log.user?.email ?? "sistema"}</span>
                  </summary>
                  <pre className="mx-4 mb-3 overflow-x-auto rounded-xl border border-border bg-surface-2/45 p-3 text-[0.72rem] text-muted">
                    {formatMetadata(log.metadata)}
                  </pre>
                </details>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
