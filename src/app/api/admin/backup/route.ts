import { NextResponse } from "next/server";
import { runAllClientBackups } from "@/lib/admin-backups";
import { verifyAdminCronSecret } from "@/lib/admin-auth";
import { sendAdminAlert } from "@/lib/admin-alerts";
import { clientIpFromRequest, logSecurityEvent } from "@/lib/security";

export const dynamic = "force-dynamic";

async function authorize(req: Request) {
  const url = new URL(req.url);
  return verifyAdminCronSecret(req.headers.get("x-admin-secret")) || verifyAdminCronSecret(url.searchParams.get("secret"));
}

export async function POST(req: Request) {
  if (!(await authorize(req))) {
    await logSecurityEvent({
      scope: "admin",
      action: "BACKUP_UNAUTHORIZED",
      ip: clientIpFromRequest(req),
      userAgent: req.headers.get("user-agent"),
      success: false,
      severity: "critical"
    });
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  await logSecurityEvent({
    scope: "admin",
    action: "BACKUP_TRIGGERED",
    ip: clientIpFromRequest(req),
    userAgent: req.headers.get("user-agent"),
    success: true
  });
  const result = await runAllClientBackups("cron");
  if (result.failed > 0) {
    await sendAdminAlert({
      title: "Backup de clientes com falha",
      message: `${result.failed}/${result.total} backup(s) falharam.`,
      level: "warning",
      data: result.results.filter((item) => !item.ok).map((item) => ({ key: item.key, error: "error" in item ? item.error : null }))
    });
  }
  return NextResponse.json(
    { ok: result.failed === 0, at: new Date().toISOString(), ...result },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(req: Request) {
  return POST(req);
}
