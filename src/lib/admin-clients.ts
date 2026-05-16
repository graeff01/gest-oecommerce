import "server-only";

import { AdminClientPlan, AdminClientStatus, PrismaClient } from "@prisma/client";
import { prisma as masterPrisma } from "@/lib/prisma";

export type ClientConfig = {
  id?: string;
  key: string;
  name: string;
  storeName?: string | null;
  appUrl?: string | null;
  url: string;
  status?: AdminClientStatus;
  plan?: AdminClientPlan;
  monthlyFee?: number | null;
  renewalDay?: number | null;
  notes?: string | null;
  source?: "database" | "env";
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

const envClientsConfig = parseClients();
const clientInstances = new Map<string, PrismaClient>();

function getClientPrisma(url: string): PrismaClient {
  if (clientInstances.has(url)) return clientInstances.get(url)!;
  const client = new PrismaClient({ datasources: { db: { url } } });
  clientInstances.set(url, client);
  return client;
}

export type Alert = {
  level: "critical" | "warning" | "info";
  message: string;
};

export type ClientSnapshot = {
  id?: string;
  key: string;
  name: string;
  storeName: string;
  appUrl: string | null;
  status: AdminClientStatus;
  plan: AdminClientPlan;
  monthlyFee: number | null;
  renewalDay: number | null;
  source: "database" | "env";
  online: boolean;
  lastSaleAt: Date | null;
  lastSaleAgo: string | null;
  salesLast7: number;
  salesLast30: number;
  activeUsers: number;
  totalUsers: number;
  totalProducts: number;
  productsWithoutVariants: number;
  totalCustomers: number;
  newCustomersLast30: number;
  alerts: Alert[];
  alertCount: number;
  error?: string;
};

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `ha ${Math.max(0, mins)} min`;
  if (hours < 24) return `ha ${hours}h`;
  if (days === 1) return "ontem";
  return `ha ${days} dias`;
}

export async function fetchClientSnapshot(config: ClientConfig): Promise<ClientSnapshot> {
  const prisma = getClientPrisma(config.url);

  try {
    const now = new Date();
    const ago7 = new Date(now.getTime() - 7 * 86400000);
    const ago30 = new Date(now.getTime() - 30 * 86400000);
    const ago60 = new Date(now.getTime() - 60 * 86400000);

    const [
      settings,
      lastOrder,
      salesLast7,
      salesLast30,
      users,
      totalProducts,
      productsWithoutVariants,
      totalCustomers,
      newCustomersLast30,
      overdueInstallments,
      stuckOrders,
      outOfStockCount,
      customersNoActivity
    ] = await Promise.all([
      prisma.storeSettings.findFirst(),
      prisma.order.findFirst({
        where: { status: { not: "CANCELED" } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true }
      }),
      prisma.order.count({
        where: { status: { not: "CANCELED" }, createdAt: { gte: ago7 } }
      }),
      prisma.order.count({
        where: { status: { not: "CANCELED" }, createdAt: { gte: ago30 } }
      }),
      prisma.user.findMany({ select: { active: true } }),
      prisma.product.count(),
      prisma.product.count({ where: { variants: { none: {} } } }),
      prisma.customer.count(),
      prisma.customer.count({ where: { createdAt: { gte: ago30 } } }),
      prisma.installment.count({
        where: {
          paidAt: null,
          dueDate: { lt: new Date(now.getTime() - 3 * 86400000) }
        }
      }),
      prisma.order.count({
        where: { status: "NEW", createdAt: { lt: ago7 } }
      }),
      prisma.productVariant.count({ where: { stockQuantity: 0 } }),
      prisma.customer.count({
        where: {
          orders: {
            none: { createdAt: { gte: ago60 } }
          }
        }
      })
    ]);

    const alerts: Alert[] = [];
    const daysSinceLastSale = lastOrder
      ? Math.floor((now.getTime() - lastOrder.createdAt.getTime()) / 86400000)
      : null;

    if (config.status === "SUSPENDED") {
      alerts.push({ level: "critical", message: "Cliente suspenso no painel master" });
    }

    if (config.status === "TRIAL") {
      alerts.push({ level: "info", message: "Cliente em periodo de teste" });
    }

    if (daysSinceLastSale === null) {
      alerts.push({ level: "warning", message: "Nenhuma venda registrada ainda" });
    } else if (daysSinceLastSale >= 7) {
      alerts.push({ level: "critical", message: `Sem vendas ha ${daysSinceLastSale} dias` });
    } else if (daysSinceLastSale >= 3) {
      alerts.push({ level: "warning", message: `Sem vendas ha ${daysSinceLastSale} dias` });
    }

    if (overdueInstallments > 0) {
      alerts.push({
        level: overdueInstallments >= 5 ? "critical" : "warning",
        message: `${overdueInstallments} parcela${overdueInstallments > 1 ? "s" : ""} de crediario vencida${overdueInstallments > 1 ? "s" : ""}`
      });
    }

    if (stuckOrders > 0) {
      alerts.push({
        level: "warning",
        message: `${stuckOrders} pedido${stuckOrders > 1 ? "s" : ""} parado${stuckOrders > 1 ? "s" : ""} em Novo ha mais de 7 dias`
      });
    }

    if (outOfStockCount > 0) {
      alerts.push({
        level: outOfStockCount >= 10 ? "critical" : "warning",
        message: `${outOfStockCount} SKU${outOfStockCount > 1 ? "s" : ""} sem estoque`
      });
    }

    if (productsWithoutVariants > 0) {
      alerts.push({
        level: "info",
        message: `${productsWithoutVariants} produto${productsWithoutVariants > 1 ? "s" : ""} sem variacao`
      });
    }

    if (salesLast30 === 0 && (totalCustomers > 0 || totalProducts > 0)) {
      alerts.push({ level: "warning", message: "Nenhuma venda nos ultimos 30 dias" });
    }

    if (customersNoActivity > 0 && totalCustomers > 0) {
      const pct = Math.round((customersNoActivity / totalCustomers) * 100);
      if (pct >= 50) {
        alerts.push({
          level: "info",
          message: `${pct}% dos clientes sem compra nos ultimos 60 dias`
        });
      }
    }

    return {
      id: config.id,
      key: config.key,
      name: config.name,
      storeName: config.storeName || settings?.storeName || config.name,
      appUrl: config.appUrl ?? null,
      status: config.status ?? "ACTIVE",
      plan: config.plan ?? "STARTER",
      monthlyFee: config.monthlyFee ?? null,
      renewalDay: config.renewalDay ?? null,
      source: config.source ?? "env",
      online: true,
      lastSaleAt: lastOrder?.createdAt ?? null,
      lastSaleAgo: lastOrder ? timeAgo(lastOrder.createdAt) : null,
      salesLast7,
      salesLast30,
      activeUsers: users.filter((u) => u.active).length,
      totalUsers: users.length,
      totalProducts,
      productsWithoutVariants,
      totalCustomers,
      newCustomersLast30,
      alerts,
      alertCount: alerts.filter((a) => a.level !== "info").length
    };
  } catch (err) {
    return {
      id: config.id,
      key: config.key,
      name: config.name,
      storeName: config.storeName || config.name,
      appUrl: config.appUrl ?? null,
      status: config.status ?? "ACTIVE",
      plan: config.plan ?? "STARTER",
      monthlyFee: config.monthlyFee ?? null,
      renewalDay: config.renewalDay ?? null,
      source: config.source ?? "env",
      online: false,
      lastSaleAt: null,
      lastSaleAgo: null,
      salesLast7: 0,
      salesLast30: 0,
      activeUsers: 0,
      totalUsers: 0,
      totalProducts: 0,
      productsWithoutVariants: 0,
      totalCustomers: 0,
      newCustomersLast30: 0,
      alerts: [{ level: "critical", message: "Banco do cliente inacessivel" }],
      alertCount: 1,
      error: err instanceof Error ? err.message : "Erro desconhecido"
    };
  }
}

async function fetchDatabaseClientConfigs(): Promise<ClientConfig[]> {
  try {
    const rows = await masterPrisma.adminClient.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }]
    });

    return rows.map((row) => ({
      id: row.id,
      key: row.key,
      name: row.name,
      storeName: row.storeName,
      appUrl: row.appUrl,
      url: row.databaseUrl,
      status: row.status,
      plan: row.plan,
      monthlyFee: row.monthlyFee === null ? null : Number(row.monthlyFee),
      renewalDay: row.renewalDay,
      notes: row.notes,
      source: "database"
    }));
  } catch {
    return [];
  }
}

export async function fetchAllClients(): Promise<ClientSnapshot[]> {
  const databaseClients = await fetchDatabaseClientConfigs();
  const envClients = envClientsConfig.map((client) => ({ ...client, source: "env" as const }));
  const configs = databaseClients.length ? databaseClients : envClients;
  if (configs.length === 0) return [];
  return Promise.all(configs.map(fetchClientSnapshot));
}

