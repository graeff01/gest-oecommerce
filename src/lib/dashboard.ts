import { prisma } from "@/lib/prisma";

export async function getDashboardData() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [orders, transactions, allTransactionTotals, variants, customers, recentOrders, settings] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: startOfMonth }, status: { not: "CANCELED" } },
      include: { items: true }
    }),
    prisma.financialTransaction.findMany({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.financialTransaction.groupBy({ by: ["type"], _sum: { amount: true } }),
    prisma.productVariant.findMany({
      include: { product: true },
      orderBy: { stockQuantity: "asc" },
      take: 8
    }),
    prisma.customer.count(),
    prisma.order.findMany({
      include: { customer: true, items: { include: { variant: { include: { product: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.storeSettings.findUnique({ where: { id: 1 } })
  ]);

  const revenue = transactions
    .filter((item) => item.type === "REVENUE")
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const expenses = transactions
    .filter((item) => item.type === "EXPENSE")
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const salesTotal = orders.reduce((sum, order) => sum + Number(order.total), 0);
  const estimatedCost = orders.flatMap((order) => order.items).reduce((sum, item) => sum + Number(item.costPrice) * item.quantity, 0);
  const lowStock = variants.filter((variant) => variant.stockQuantity <= variant.minStock);

  const allRevenue = Number(allTransactionTotals.find((t) => t.type === "REVENUE")?._sum.amount ?? 0);
  const allExpenses = Number(allTransactionTotals.find((t) => t.type === "EXPENSE")?._sum.amount ?? 0);
  const initialBalance = Number(settings?.cashBalance ?? 0);
  const currentBalance = initialBalance + allRevenue - allExpenses;

  const chart = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - index));
    const key = day.toISOString().slice(0, 10);
    const total = orders
      .filter((order) => order.createdAt.toISOString().slice(0, 10) === key)
      .reduce((sum, order) => sum + Number(order.total), 0);
    return { day: day.toLocaleDateString("pt-BR", { weekday: "short" }), total };
  });

  return {
    metrics: {
      salesTotal,
      revenue,
      expenses,
      profit: salesTotal - estimatedCost - expenses,
      customers,
      lowStock: lowStock.length,
      currentBalance,
      initialBalance
    },
    chart,
    lowStock,
    recentOrders
  };
}
