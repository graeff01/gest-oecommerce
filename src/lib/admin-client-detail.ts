import "server-only";

import { PrismaClient } from "@prisma/client";

const clientInstances = new Map<string, PrismaClient>();

function getClientPrisma(url: string): PrismaClient {
  if (clientInstances.has(url)) return clientInstances.get(url)!;
  const client = new PrismaClient({ datasources: { db: { url } } });
  clientInstances.set(url, client);
  return client;
}

export type RecentOrder = {
  id: string;
  code: string;
  status: string;
  total: number;
  paymentMethod: string;
  channel: string;
  customer: string | null;
  createdAt: Date;
};

export type TopProduct = {
  id: string;
  name: string;
  category: string;
  totalSold: number;
  revenue: number;
};

export type TopCustomer = {
  id: string;
  name: string;
  totalSpent: number;
  orderCount: number;
};

export type SalesPoint = {
  date: string; // YYYY-MM-DD
  orders: number;
  revenue: number;
};

export type ClientDetail = {
  ok: true;
  recentOrders: RecentOrder[];
  topProducts: TopProduct[];
  topCustomers: TopCustomer[];
  salesByDay: SalesPoint[];
  revenue7: number;
  revenue30: number;
  averageTicket: number;
  cashBalance: number;
  ordersByStatus: { status: string; count: number }[];
  lowStockCount: number;
} | {
  ok: false;
  error: string;
};

export async function fetchClientDetail(databaseUrl: string): Promise<ClientDetail> {
  try {
    const prisma = getClientPrisma(databaseUrl);
    const now = new Date();
    const ago7 = new Date(now.getTime() - 7 * 86400000);
    const ago30 = new Date(now.getTime() - 30 * 86400000);

    const [
      recentOrdersRaw,
      orders30,
      products,
      orderItems30,
      orderStatuses,
      lowStock,
      settings
    ] = await Promise.all([
      prisma.order.findMany({
        where: { status: { not: "CANCELED" } },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { customer: { select: { name: true } } }
      }),
      prisma.order.findMany({
        where: { status: { not: "CANCELED" }, createdAt: { gte: ago30 } },
        select: {
          id: true,
          total: true,
          customerId: true,
          createdAt: true,
          items: { select: { variantId: true, quantity: true, unitPrice: true } },
          customer: { select: { name: true } }
        }
      }),
      prisma.product.findMany({
        select: {
          id: true,
          name: true,
          category: true,
          variants: { select: { id: true } }
        }
      }),
      prisma.orderItem.findMany({
        where: { order: { status: { not: "CANCELED" }, createdAt: { gte: ago30 } } },
        select: { variantId: true, quantity: true, unitPrice: true }
      }),
      prisma.order.groupBy({
        by: ["status"],
        _count: { _all: true },
        where: { createdAt: { gte: ago30 } }
      }),
      prisma.productVariant.count({ where: { stockQuantity: { lte: 2 } } }),
      prisma.storeSettings.findFirst()
    ]);

    // Recent orders
    const recentOrders: RecentOrder[] = recentOrdersRaw.map((o) => ({
      id: o.id,
      code: o.code,
      status: o.status,
      total: Number(o.total),
      paymentMethod: o.paymentMethod,
      channel: o.channel,
      customer: o.customer?.name ?? null,
      createdAt: o.createdAt
    }));

    // Sales by day (30 days)
    const dayMap = new Map<string, { orders: number; revenue: number }>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      dayMap.set(key, { orders: 0, revenue: 0 });
    }
    let revenue30 = 0;
    let revenue7 = 0;
    orders30.forEach((o) => {
      const key = o.createdAt.toISOString().slice(0, 10);
      const entry = dayMap.get(key);
      const t = Number(o.total);
      if (entry) {
        entry.orders++;
        entry.revenue += t;
      }
      revenue30 += t;
      if (o.createdAt >= ago7) revenue7 += t;
    });
    const salesByDay: SalesPoint[] = Array.from(dayMap.entries()).map(([date, v]) => ({
      date,
      orders: v.orders,
      revenue: v.revenue
    }));

    // Top products (by quantity sold in 30d)
    const variantToProduct = new Map<string, { id: string; name: string; category: string }>();
    products.forEach((p) =>
      p.variants.forEach((v) => variantToProduct.set(v.id, { id: p.id, name: p.name, category: p.category }))
    );
    const productAgg = new Map<string, { name: string; category: string; qty: number; revenue: number }>();
    orderItems30.forEach((item) => {
      if (!item.variantId) return;
      const prod = variantToProduct.get(item.variantId);
      if (!prod) return;
      const entry = productAgg.get(prod.id) ?? { name: prod.name, category: prod.category, qty: 0, revenue: 0 };
      entry.qty += item.quantity;
      entry.revenue += item.quantity * Number(item.unitPrice);
      productAgg.set(prod.id, entry);
    });
    const topProducts: TopProduct[] = Array.from(productAgg.entries())
      .map(([id, v]) => ({ id, name: v.name, category: v.category, totalSold: v.qty, revenue: v.revenue }))
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5);

    // Top customers (by total spent 30d)
    const customerAgg = new Map<string, { name: string; total: number; count: number }>();
    orders30.forEach((o) => {
      if (!o.customerId || !o.customer) return;
      const entry = customerAgg.get(o.customerId) ?? { name: o.customer.name, total: 0, count: 0 };
      entry.total += Number(o.total);
      entry.count++;
      customerAgg.set(o.customerId, entry);
    });
    const topCustomers: TopCustomer[] = Array.from(customerAgg.entries())
      .map(([id, v]) => ({ id, name: v.name, totalSpent: v.total, orderCount: v.count }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    const averageTicket = orders30.length > 0 ? revenue30 / orders30.length : 0;
    const ordersByStatus = orderStatuses.map((s) => ({ status: s.status, count: s._count._all }));

    return {
      ok: true,
      recentOrders,
      topProducts,
      topCustomers,
      salesByDay,
      revenue7,
      revenue30,
      averageTicket,
      cashBalance: settings?.cashBalance ? Number(settings.cashBalance) : 0,
      ordersByStatus,
      lowStockCount: lowStock
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro desconhecido" };
  }
}
