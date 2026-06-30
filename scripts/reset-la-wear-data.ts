/**
 * Reset TOTAL de dados de UMA loja (ex.: la-wear).
 *
 * - Apaga TODAS as linhas de TODAS as tabelas do schema public
 *   (inclusive usuários e configurações da loja), preservando a estrutura
 *   do banco e o histórico de migrations (_prisma_migrations).
 * - Após rodar, a loja fica 100% vazia: acesse /setup para recriar o admin.
 *
 * Uso (aponte DATABASE_URL para o banco do cliente correto!):
 *   DATABASE_URL="<url-do-cliente>" npx tsx scripts/reset-la-wear-data.ts            # só mostra o que seria apagado
 *   DATABASE_URL="<url-do-cliente>" CONFIRM=YES npx tsx scripts/reset-la-wear-data.ts # apaga de verdade
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const confirm = process.env.CONFIRM === "YES";

  // Identificação da loja, para evitar apagar o banco errado
  const settings = await prisma.storeSettings.findUnique({ where: { id: 1 } }).catch(() => null);
  const storeName = settings?.storeName ?? "(sem StoreSettings)";

  // Lista as tabelas do schema public (exceto o controle de migrations)
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
    ORDER BY tablename
  `;

  // Conta linhas de cada tabela
  let totalRows = 0;
  const counts: Array<{ table: string; rows: number }> = [];
  for (const { tablename } of tables) {
    const res = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT COUNT(*)::bigint AS n FROM "${tablename}"`
    );
    const rows = Number(res[0]?.n ?? 0);
    totalRows += rows;
    counts.push({ table: tablename, rows });
  }

  console.log(`\n=== Banco alvo ===`);
  console.log(`Loja (StoreSettings.storeName): ${storeName}`);
  console.log(`Tabelas: ${tables.length} · Linhas totais: ${totalRows}\n`);
  for (const c of counts.filter((c) => c.rows > 0)) {
    console.log(`  ${c.table.padEnd(28)} ${c.rows}`);
  }
  if (counts.every((c) => c.rows === 0)) console.log("  (todas as tabelas já estão vazias)");

  if (!confirm) {
    console.log(`\n[dry-run] Nada foi apagado.`);
    console.log(`Para apagar de verdade, rode novamente com  CONFIRM=YES`);
    return;
  }

  // Apaga tudo de uma vez, respeitando FKs com CASCADE
  const list = tables.map((t) => `"${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);

  console.log(`\n✓ Reset concluído. Todas as ${tables.length} tabelas foram esvaziadas.`);
  console.log(`Próximo passo: acesse /setup na loja "${storeName}" para recriar o administrador.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
