import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEST_EMAIL = "teste@cliente.com";
const TEST_PASSWORD = "Teste@2026";

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

  console.log(`[seed] Usuário de teste pronto: ${TEST_EMAIL} / ${TEST_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
