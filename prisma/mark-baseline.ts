/**
 * Run once on each production database to mark the initial migration
 * as already applied, without executing the SQL (tables already exist).
 *
 * Usage: DATABASE_URL=<url> npx tsx prisma/mark-baseline.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      id VARCHAR(36) PRIMARY KEY,
      checksum VARCHAR(64) NOT NULL,
      finished_at TIMESTAMPTZ,
      migration_name VARCHAR(255) NOT NULL,
      logs TEXT,
      rolled_back_at TIMESTAMPTZ,
      started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      applied_steps_count INTEGER NOT NULL DEFAULT 0
    )
  `);

  const existing = await prisma.$queryRaw<{ migration_name: string }[]>`
    SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = '20260513000000_init'
  `;

  if (existing.length > 0) {
    console.log("✓ Baseline already marked — nothing to do.");
    return;
  }

  await prisma.$executeRawUnsafe(`
    INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, applied_steps_count)
    VALUES (
      gen_random_uuid()::text,
      'baseline',
      now(),
      '20260513000000_init',
      'Marked as baseline — tables already existed before migration tracking was introduced.',
      1
    )
  `);

  console.log("✓ Migration 20260513000000_init marked as baseline successfully.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
