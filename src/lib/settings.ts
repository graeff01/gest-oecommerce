import "server-only";

import { prisma } from "@/lib/prisma";

export type StoreSettingsData = {
  storeName: string;
  storeTagline: string | null;
  loginImageUrl: string | null;
  cashBalance: number;
  financeCategories: string[];
};

const FALLBACK: StoreSettingsData = {
  storeName: "Minha Loja",
  storeTagline: null,
  loginImageUrl: null,
  cashBalance: 0,
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
      create: { id: 1, storeName: FALLBACK.storeName, cashBalance: 0 }
    });

    return {
      storeName: settings.storeName,
      storeTagline: settings.storeTagline,
      loginImageUrl: settings.loginImageUrl,
      cashBalance: Number(settings.cashBalance),
      financeCategories: settings.financeCategories ?? []
    };
  } catch {
    return FALLBACK;
  }
}

export async function updateStoreSettings(data: Partial<Omit<StoreSettingsData, "cashBalance">> & { cashBalance?: number }) {
  await prisma.storeSettings.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, storeName: data.storeName ?? FALLBACK.storeName, ...data }
  });
}
