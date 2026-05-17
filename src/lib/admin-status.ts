import "server-only";

import { PrismaClient } from "@prisma/client";
import { decryptSecret } from "@/lib/admin-crypto";

const instances = new Map<string, PrismaClient>();

function getClientPrisma(url: string) {
  const plain = decryptSecret(url);
  if (instances.has(plain)) return instances.get(plain)!;
  const client = new PrismaClient({ datasources: { db: { url: plain } } });
  instances.set(plain, client);
  return client;
}

export async function checkAppUrl(appUrl: string | null) {
  if (!appUrl) return { ok: false, status: null, error: "Sem APP_URL" };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(appUrl, { method: "HEAD", signal: controller.signal, cache: "no-store" });
    clearTimeout(timer);
    return { ok: res.status < 500, status: res.status, error: null };
  } catch (err) {
    return { ok: false, status: null, error: err instanceof Error ? err.message : "Erro desconhecido" };
  }
}

export async function getLatestMigration(databaseUrl: string) {
  try {
    const db = getClientPrisma(databaseUrl);
    const rows = await db.$queryRaw<Array<{ migration_name: string; finished_at: Date | null }>>`
      SELECT migration_name, finished_at
      FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL
      ORDER BY finished_at DESC
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch {
    return null;
  }
}
