import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEST_EMAIL = process.env.TEST_EMAIL ?? "teste@cliente.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "Teste@2026";
const STORE_NAME = process.env.STORE_NAME ?? "LA WEAR";

async function main() {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);

  await prisma.user.upsert({
    where: { email: TEST_EMAIL },
    update: {
      name: "Usuário de teste",
      passwordHash,
      role: "ADMIN",
      active: true
    },
    create: {
      name: "Usuário de teste",
      email: TEST_EMAIL,
      passwordHash,
      role: "ADMIN"
    }
  });

  const existing = await prisma.storeSettings.findUnique({ where: { id: 1 } });
  const migratedImageUrl =
    existing?.loginImageUrl && existing.loginImageUrl.startsWith("/uploads/")
      ? existing.loginImageUrl.replace("/uploads/", "/api/uploads/")
      : undefined;

  await prisma.storeSettings.upsert({
    where: { id: 1 },
    update: {
      storeName: STORE_NAME,
      ...(migratedImageUrl ? { loginImageUrl: migratedImageUrl } : {})
    },
    create: { id: 1, storeName: STORE_NAME }
  });

  console.log(`[seed] Usuário de teste pronto: ${TEST_EMAIL} / ${TEST_PASSWORD}`);
  console.log(`[seed] Loja: ${STORE_NAME}`);
  if (migratedImageUrl) {
    console.log(`[seed] Migrated login image URL to ${migratedImageUrl}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
