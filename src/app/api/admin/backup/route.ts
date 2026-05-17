import { NextResponse } from "next/server";
import { runAllClientBackups } from "@/lib/admin-backups";
import { verifyAdminCronSecret } from "@/lib/admin-auth";
import { sendAdminAlert } from "@/lib/admin-alerts";

export const dynamic = "force-dynamic";

async function authorize(req: Request) {
  const url = new URL(req.url);
  return verifyAdminCronSecret(req.headers.get("x-admin-secret")) || verifyAdminCronSecret(url.searchParams.get("secret"));
}

export async function POST(req: Request) {
  if (!(await authorize(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const result = await runAllClientBackups("cron");
  if (result.failed > 0) {
    await sendAdminAlert({
      title: "Backup de clientes com falha",
      message: `${result.failed}/${result.total} backup(s) falharam.`,
      level: "warning",
      data: result.results.filter((item) => !item.ok).map((item) => ({ key: item.key, error: "error" in item ? item.error : null }))
    });
  }
  return NextResponse.json({ ok: result.failed === 0, at: new Date().toISOString(), ...result });
}

export async function GET(req: Request) {
  return POST(req);
}
