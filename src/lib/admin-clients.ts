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

export type Alert = {
  level: "critical" | "warning" | "info";
  message: string;
};

export type ClientSnapshot = {
  key: string;
  name: string;
  storeName: string;

  // saúde
  online: boolean;
  lastSaleAt: Date | null;
  lastSaleAgo: string | null;

  // engajamento (últimos 7 dias)
  salesLast7: number;
  salesLast30: number;
  activeUsers: number;
  totalUsers: number;

  // crescimento
  totalProducts: number;
  productsWithoutVariants: number;
  totalCustomers: number;
  newCustomersLast30: number;

  // alertas
  alerts: Alert[];
  alertCount: number;

  error?: string;
};

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `há ${mins} min`;
  if (hours < 24) return `há ${hours}h`;
  if (days === 1) return "ontem";
  return `há ${days} dias`;
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
      lowStockCount,
      customersNoActivity,
    ] = await Promise.all([
      prisma.storeSettings.findFirst(),

      // última venda
      prisma.order.findFirst({
        where: { status: { not: "CANCELED" } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true }
      }),

      // vendas últimos 7 dias
      prisma.order.count({
        where: { status: { not: "CANCELED" }, createdAt: { gte: ago7 } }
      }),

      // vendas últimos 30 dias
      prisma.order.count({
        where: { status: { not: "CANCELED" }, createdAt: { gte: ago30 } }
      }),

      // usuários
      prisma.user.findMany({
        select: { active: true }
      }),

      // total produtos
      prisma.product.count(),

      // produtos sem variações
      prisma.product.count({
        where: { variants: { none: {} } }
      }),

      // total clientes
      prisma.customer.count(),

      // novos clientes últimos 30 dias
      prisma.customer.count({
        where: { createdAt: { gte: ago30 } }
      }),

      // parcelas vencidas há mais de 3 dias
      prisma.installment.count({
        where: {
          paidAt: null,
          dueDate: { lt: new Date(now.getTime() - 3 * 86400000) }
        }
      }),

      // pedidos travados em NEW há mais de 7 dias
      prisma.order.count({
        where: { status: "NEW", createdAt: { lt: ago7 } }
      }),

      // variações sem estoque
      prisma.productVariant.count({
        where: { stockQuantity: 0 }
      }),

      // variações com estoque baixo (acima de zero mas no mínimo)
      prisma.productVariant.count({
        where: {
          stockQuantity: { gt: 0 },
          AND: [{ stockQuantity: { lte: prisma.productVariant.fields.minStock as unknown as number } }]
        }
      }).catch(() => 0),

      // clientes sem compra nos últimos 60 dias (base parada)
      prisma.customer.count({
        where: {
          orders: {
            none: { createdAt: { gte: ago60 } }
          }
        }
      }),
    ]);

    // monta alertas
    const alerts: Alert[] = [];

    const daysSinceLastSale = lastOrder
      ? Math.floor((now.getTime() - lastOrder.createdAt.getTime()) / 86400000)
      : null;

    if (daysSinceLastSale === null) {
      alerts.push({ level: "warning", message: "Nenhuma venda registrada ainda" });
    } else if (daysSinceLastSale >= 7) {
      alerts.push({ level: "critical", message: `Sem vendas há ${daysSinceLastSale} dias` });
    } else if (daysSinceLastSale >= 3) {
      alerts.push({ level: "warning", message: `Sem vendas há ${daysSinceLastSale} dias` });
    }

    if (overdueInstallments > 0) {
      alerts.push({
        level: overdueInstallments >= 5 ? "critical" : "warning",
        message: `${overdueInstallments} parcela${overdueInstallments > 1 ? "s" : ""} de crediário vencida${overdueInstallments > 1 ? "s" : ""}`
      });
    }

    if (stuckOrders > 0) {
      alerts.push({
        level: "warning",
        message: `${stuckOrders} pedido${stuckOrders > 1 ? "s" : ""} parado${stuckOrders > 1 ? "s" : ""} em "Novo" há mais de 7 dias`
      });
    }

    if (outOfStockCount > 0) {
      alerts.push({
        level: outOfStockCount >= 10 ? "critical" : "warning",
        message: `${outOfStockCount} variação${outOfStockCount > 1 ? "ões" : ""} sem estoque`
      });
    }

    if (productsWithoutVariants > 0) {
      alerts.push({
        level: "info",
        message: `${productsWithoutVariants} produto${productsWithoutVariants > 1 ? "s" : ""} sem variações cadastradas`
      });
    }

    if (salesLast30 === 0 && (totalCustomers > 0 || totalProducts > 0)) {
      alerts.push({ level: "warning", message: "Nenhuma venda nos últimos 30 dias" });
    }

    if (customersNoActivity > 0 && totalCustomers > 0) {
      const pct = Math.round((customersNoActivity / totalCustomers) * 100);
      if (pct >= 50) {
        alerts.push({
          level: "info",
          message: `${pct}% dos clientes sem compra nos últimos 60 dias`
        });
      }
    }

    return {
      key: config.key,
      name: config.name,
      storeName: settings?.storeName ?? config.name,
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
      alertCount: alerts.filter((a) => a.level !== "info").length,
    };
  } catch (err) {
    return {
      key: config.key,
      name: config.name,
      storeName: config.name,
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
      alerts: [],
      alertCount: 0,
      error: err instanceof Error ? err.message : "Erro desconhecido"
    };
  }
}

export async function fetchAllClients(): Promise<ClientSnapshot[]> {
  if (clientsConfig.length === 0) return [];
  return Promise.all(clientsConfig.map(fetchClientSnapshot));
}
