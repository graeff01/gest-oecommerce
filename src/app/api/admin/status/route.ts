import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, getAdminSessionFromToken, verifyAdminCronSecret } from "@/lib/admin-auth";
import { fetchAllClients } from "@/lib/admin-clients";
import { sendAdminAlert } from "@/lib/admin-alerts";
import { clientIpFromRequest, logSecurityEvent } from "@/lib/security";

export const dynamic = "force-dynamic";

async function authorize(req: Request) {
  const cookieStore = await cookies();
  const session = getAdminSessionFromToken(cookieStore.get(ADMIN_COOKIE)?.value);
  if (session) return true;

  const url = new URL(req.url);
  return verifyAdminCronSecret(req.headers.get("x-admin-secret")) || verifyAdminCronSecret(url.searchParams.get("secret"));
}

export async function GET(req: Request) {
  if (!(await authorize(req))) {
    await logSecurityEvent({
      scope: "admin",
      action: "STATUS_UNAUTHORIZED",
      ip: clientIpFromRequest(req),
      userAgent: req.headers.get("user-agent"),
      success: false,
      severity: "critical"
    });
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const clients = await fetchAllClients();
    const online = clients.filter((client) => client.online).length;
    const critical = clients.reduce((sum, client) => sum + client.alerts.filter((alert) => alert.level === "critical").length, 0);

    const ok = critical === 0 && online === clients.length;
    if (!ok && req.headers.get("x-send-alert") === "1") {
      await sendAdminAlert({
        title: "Status do sistema requer atencao",
        message: `${clients.length - online} cliente(s) offline e ${critical} alerta(s) critico(s).`,
        level: critical > 0 ? "critical" : "warning"
      });
    }

    return NextResponse.json(
      {
        ok,
        at: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
        masterDb: "ok",
        clients: {
          total: clients.length,
          online,
          offline: clients.length - online,
          criticalAlerts: critical
        }
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        at: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
        masterDb: "error",
        error: err instanceof Error ? err.message : "unknown"
      },
      { status: 500 }
    );
  }
}
