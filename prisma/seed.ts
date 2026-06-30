import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STORE_NAME = process.env.STORE_NAME ?? "Minha Loja";

async function main() {
  // Migra URL de imagem de login antiga se necessário
  const existing = await prisma.storeSettings.findUnique({ where: { id: 1 } });
  const migratedImageUrl =
    existing?.loginImageUrl && existing.loginImageUrl.startsWith("/uploads/")
      ? existing.loginImageUrl.replace("/uploads/", "/api/uploads/")
      : undefined;

  await prisma.storeSettings.upsert({
    where: { id: 1 },
    update: {
      ...(migratedImageUrl ? { loginImageUrl: migratedImageUrl } : {})
    },
    create: { id: 1, storeName: STORE_NAME }
  });

  const userCount = await prisma.user.count();
  if (userCount === 0) {
    console.log("[seed] Nenhum usuário encontrado.");
    console.log("[seed] Acesse /setup no navegador para criar o administrador.");
  } else {
    console.log(`[seed] ${userCount} usuário(s) já cadastrado(s). Nenhuma ação necessária.`);
  }

  if (migratedImageUrl) {
    console.log(`[seed] Migrated login image URL to ${migratedImageUrl}`);
  }

  console.log(`[seed] Configurações da loja: OK`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
