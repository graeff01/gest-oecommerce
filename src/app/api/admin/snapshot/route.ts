import { NextResponse } from "next/server";
import { captureAllSnapshots } from "@/lib/admin-snapshots";
import { verifyAdminCronSecret } from "@/lib/admin-auth";

// Endpoint para cron externo capturar snapshots periodicamente.
// Protegido por ADMIN_SECRET via header `x-admin-secret` ou query `?secret=...`.
//
// Exemplo de cron (Railway / EasyCron / cron-job.org):
//   POST https://seu-host/api/admin/snapshot
//   header x-admin-secret: <ADMIN_SECRET>
//
// Recomenda-se rodar 1-2x por dia (manha + noite) para capturar evolucao.

export const dynamic = "force-dynamic";

async function authorize(req: Request): Promise<boolean> {
  const url = new URL(req.url);
  const fromHeader = req.headers.get("x-admin-secret");
  const fromQuery = url.searchParams.get("secret");
  return verifyAdminCronSecret(fromHeader) || verifyAdminCronSecret(fromQuery);
}

export async function POST(req: Request) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await captureAllSnapshots();
    return NextResponse.json({ ok: true, captured: result.captured, at: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  // Permite GET tambem para servicos de cron simples que so fazem GET.
  return POST(req);
}
