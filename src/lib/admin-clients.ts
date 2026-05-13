import "server-only";

import { PrismaClient } from "@prisma/client";

export type ClientConfig = {
  key: string;
  name: string;
  url: string;
};

function parseClients(): ClientConfig[] {
  const raw = process.env.ADMIN_CLIENTS;
  if (!raw) return [];

  try {
    return JSON.parse(raw) as ClientConfig[];
  } catch {
    return [];
  }
}

const clientsConfig = parseClients();

const clientInstances = new Map<string, PrismaClient>();

function getClientPrisma(url: string): PrismaClient {
  if (clientInstances.has(url)) return clientInstances.get(url)!;
  const client = new PrismaClient({ datasources: { db: { url } } });
  clientInstances.set(url, client);
  return client;
}

export type ClientSnapshot = {
  key: string;
  name: string;
  storeName: string;
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockCount: number;
  openCrediario: number;
  recentOrders: Array<{
    code: string;
    status: string;
    total: number;
    createdAt: Date;
    customerName: string | null;
  }>;
  error?: string;
};

export async function fetchClientSnapshot(config: ClientConfig): Promise<ClientSnapshot> {
  const prisma = getClientPrisma(config.url);

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      settings,
      financials,
      totalOrders,
      totalCustomers,
      totalProducts,
      variants,
      openInstallments,
      recentOrders
    ] = await Promise.all([
      prisma.storeSettings.findFirst(),
      prisma.financialTransaction.groupBy({ by: ["type"], _sum: { amount: true }, where: { createdAt: { gte: startOfMonth } } }),
      prisma.order.count({ where: { status: { not: "CANCELED" }, createdAt: { gte: startOfMonth } } }),
      prisma.customer.count(),
      prisma.product.count(),
      prisma.productVariant.findMany({ select: { stockQuantity: true, minStock: true } }),
      prisma.installment.aggregate({ _sum: { amount: true }, where: { paidAt: null } }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { customer: { select: { name: true } } },
        select: { code: true, status: true, total: true, createdAt: true, customer: { select: { name: true } } }
      })
    ]);

    const revenue = Number(financials.find((f) => f.type === "REVENUE")?._sum.amount ?? 0);
    const expenses = Number(financials.find((f) => f.type === "EXPENSE")?._sum.amount ?? 0);
    const lowStockCount = variants.filter((v) => v.stockQuantity <= v.minStock).length;

    return {
      key: config.key,
      name: config.name,
      storeName: settings?.storeName ?? config.name,
      totalRevenue: revenue,
      totalExpenses: expenses,
      profit: revenue - expenses,
      totalOrders,
      totalCustomers,
      totalProducts,
      lowStockCount,
      openCrediario: Number(openInstallments._sum.amount ?? 0),
      recentOrders: recentOrders.map((o) => ({
        code: o.code,
        status: o.status,
        total: Number(o.total),
        createdAt: o.createdAt,
        customerName: o.customer?.name ?? null
      }))
    };
  } catch (err) {
    return {
      key: config.key,
      name: config.name,
      storeName: config.name,
      totalRevenue: 0,
      totalExpenses: 0,
      profit: 0,
      totalOrders: 0,
      totalCustomers: 0,
      totalProducts: 0,
      lowStockCount: 0,
      openCrediario: 0,
      recentOrders: [],
      error: err instanceof Error ? err.message : "Erro desconhecido"
    };
  }
}

export async function fetchAllClients(): Promise<ClientSnapshot[]> {
  if (clientsConfig.length === 0) return [];
  return Promise.all(clientsConfig.map(fetchClientSnapshot));
}
