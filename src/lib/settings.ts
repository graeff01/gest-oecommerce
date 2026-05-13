import "server-only";

import { prisma } from "@/lib/prisma";

export type StoreSettingsData = {
  storeName: string;
  storeTagline: string | null;
  loginImageUrl: string | null;
  cashBalance: number;
};

const FALLBACK: StoreSettingsData = {
  storeName: "LA WEAR",
  storeTagline: null,
  loginImageUrl: null,
  cashBalance: 0
};

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
      cashBalance: Number(settings.cashBalance)
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
