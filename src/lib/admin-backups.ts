import "server-only";

import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/admin-crypto";

const instances = new Map<string, PrismaClient>();

function getClientPrisma(url: string) {
  if (instances.has(url)) return instances.get(url)!;
  const client = new PrismaClient({ datasources: { db: { url } } });
  instances.set(url, client);
  return client;
}

function decimalToNumber<T extends object>(row: T, keys: string[]) {
  const next = { ...row } as Record<string, unknown>;
  keys.forEach((key) => {
    const value = next[key];
    if (value !== null && value !== undefined) next[key] = Number(value);
  });
  return next as T;
}

export async function buildClientBackup(clientId: string) {
  const client = await prisma.adminClient.findUnique({ where: { id: clientId } });
  if (!client) throw new Error("Cliente nao encontrado.");

  const db = getClientPrisma(decryptSecret(client.databaseUrl));
  const [
    customers,
    suppliers,
    products,
    variants,
    orders,
    orderItems,
    installments,
    purchases,
    purchaseItems,
    transactions,
    movements,
    settings
  ] = await Promise.all([
    db.customer.findMany({ orderBy: { createdAt: "asc" } }),
    db.supplier.findMany({ orderBy: { createdAt: "asc" } }),
    db.product.findMany({ orderBy: { createdAt: "asc" } }),
    db.productVariant.findMany({ orderBy: { createdAt: "asc" } }),
    db.order.findMany({ orderBy: { createdAt: "asc" } }),
    db.orderItem.findMany(),
    db.installment.findMany({ orderBy: { createdAt: "asc" } }),
    db.purchase.findMany({ orderBy: { createdAt: "asc" } }),
    db.purchaseItem.findMany(),
    db.financialTransaction.findMany({ orderBy: { createdAt: "asc" } }),
    db.stockMovement.findMany({ orderBy: { createdAt: "asc" } }),
    db.storeSettings.findUnique({ where: { id: 1 } })
  ]);

  const data = {
    customers,
    suppliers,
    products,
    variants: variants.map((v) => decimalToNumber(v, ["costPrice", "salePrice"])),
    orders: orders.map((o) => decimalToNumber(o, ["subtotal", "discount", "fee", "total"])),
    orderItems: orderItems.map((i) => decimalToNumber(i, ["unitPrice", "costPrice"])),
    installments: installments.map((i) => decimalToNumber(i, ["amount"])),
    purchases: purchases.map((p) => decimalToNumber(p, ["freight", "total"])),
    purchaseItems: purchaseItems.map((i) => decimalToNumber(i, ["unitCost"])),
    financialTransactions: transactions.map((t) => decimalToNumber(t, ["amount"])),
    stockMovements: movements,
    settings: settings ?? null
  };

  const itemCounts = {
    customers: customers.length,
    suppliers: suppliers.length,
    products: products.length,
    variants: variants.length,
    orders: orders.length,
    installments: installments.length,
    transactions: transactions.length
  };

  const backup = {
    version: 1,
    client: { key: client.key, name: client.name, storeName: client.storeName },
    exportedAt: new Date().toISOString(),
    itemCounts,
    data
  };

  const json = JSON.stringify(backup, null, 2);
  return {
    client,
    backup,
    json,
    sizeBytes: Buffer.byteLength(json, "utf8"),
    itemCounts
  };
}

export async function runClientBackup(clientId: string, triggeredBy = "manual") {
  const run = await prisma.adminBackupRun.create({
    data: { clientId, status: "RUNNING", triggeredBy }
  });

  try {
    const result = await buildClientBackup(clientId);
    await prisma.adminBackupRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCESS",
        finishedAt: new Date(),
        sizeBytes: result.sizeBytes,
        itemCounts: result.itemCounts
      }
    });
    return { ok: true as const, runId: run.id, sizeBytes: result.sizeBytes, itemCounts: result.itemCounts };
  } catch (err) {
    await prisma.adminBackupRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        error: err instanceof Error ? err.message : "unknown"
      }
    }).catch(() => null);
    return { ok: false as const, runId: run.id, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function runAllClientBackups(triggeredBy = "cron") {
  const clients = await prisma.adminClient.findMany({ where: { status: { not: "CANCELED" } } });
  const results = [];
  for (const client of clients) {
    results.push({ key: client.key, ...(await runClientBackup(client.id, triggeredBy)) });
  }
  return {
    total: results.length,
    success: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results
  };
}

export async function getLatestBackupByClient() {
  const runs = await prisma.adminBackupRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 500
  }).catch(() => []);

  const map = new Map<string, (typeof runs)[number]>();
  runs.forEach((run) => {
    if (!map.has(run.clientId)) map.set(run.clientId, run);
  });
  return map;
}
