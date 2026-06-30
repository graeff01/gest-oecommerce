import "server-only";

import { prisma } from "@/lib/prisma";

export type StoreSettingsData = {
  storeName: string;
  storeTagline: string | null;
  loginImageUrl: string | null;
  financeCategories: string[];
};

const FALLBACK: StoreSettingsData = {
  storeName: "Minha Loja",
  storeTagline: null,
  loginImageUrl: null,
  financeCategories: []
};

export const DEFAULT_FINANCE_CATEGORIES = [
  "Vendas",
  "Crediário",
  "Mercadorias",
  "Marketing",
  "Aluguel",
  "Salários",
  "Transporte",
  "Embalagens",
  "Outros"
];

export async function getStoreSettings(): Promise<StoreSettingsData> {
  try {
    const settings = await prisma.storeSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, storeName: FALLBACK.storeName }
    });

    return {
      storeName: settings.storeName,
      storeTagline: settings.storeTagline,
      loginImageUrl: settings.loginImageUrl,
      financeCategories: settings.financeCategories ?? []
    };
  } catch {
    return FALLBACK;
  }
}

export async function updateStoreSettings(data: Partial<StoreSettingsData>) {
  await prisma.storeSettings.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, storeName: data.storeName ?? FALLBACK.storeName, ...data }
  });
}
