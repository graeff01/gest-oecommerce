import "server-only";

import { prisma } from "@/lib/prisma";

const DEFAULT_ONBOARDING = [
  { key: "railway-db", title: "Banco criado no Railway", description: "db-cliente com volume persistente.", order: 10 },
  { key: "railway-app", title: "App criado no Railway", description: "app-cliente conectado ao GitHub.", order: 20 },
  { key: "env-vars", title: "Variaveis configuradas", description: "DATABASE_URL, AUTH_SECRET e APP_URL corretos.", order: 30 },
  { key: "migrations", title: "Migrations aplicadas", description: "Schema atualizado no banco do cliente.", order: 40 },
  { key: "first-user", title: "Usuario inicial criado", description: "Cliente consegue acessar o sistema.", order: 50 },
  { key: "sale-test", title: "Venda teste validada", description: "Fluxo de venda, estoque e financeiro conferido.", order: 60 },
  { key: "mobile-test", title: "Mobile validado", description: "Formularios e tabelas utilizaveis no celular.", order: 70 },
  { key: "backup-test", title: "Backup conferido", description: "Exportacao/restore testado para o cliente.", order: 80 }
];

export async function ensureOnboardingItems(clientId: string) {
  await Promise.all(
    DEFAULT_ONBOARDING.map((item) =>
      prisma.adminOnboardingItem.upsert({
        where: { clientId_key: { clientId, key: item.key } },
        create: { clientId, ...item },
        update: {
          title: item.title,
          description: item.description,
          order: item.order
        }
      }).catch(() => null)
    )
  );

  return prisma.adminOnboardingItem.findMany({
    where: { clientId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }]
  }).catch(() => []);
}
