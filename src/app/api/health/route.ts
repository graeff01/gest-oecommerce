import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        ok: true,
        status: "healthy",
        database: "ok",
        at: new Date().toISOString(),
        latencyMs: Date.now() - startedAt
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "unhealthy",
        database: "error",
        at: new Date().toISOString(),
        latencyMs: Date.now() - startedAt
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
