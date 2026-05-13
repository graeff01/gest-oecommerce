import { prisma } from "@/lib/prisma";

// Formata Date para "YYYY-MM-DD" no timezone local do servidor
function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function getDashboardData() {
  const now = new Date();

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  // Janela dos últimos 7 dias para o chart
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [ordersMonth, ordersWeek, transactions, allTransactionTotals, lowStockIds, customers, recentOrders, settings] =
    await Promise.all([
      // Pedidos do mês para métricas financeiras
      prisma.order.findMany({
        where: { createdAt: { gte: startOfMonth }, status: { not: "CANCELED" } },
        include: { items: true }
      }),
      // Pedidos dos últimos 7 dias para o chart (pode incluir dias do mês anterior)
      prisma.order.findMany({
        where: { createdAt: { gte: sevenDaysAgo }, status: { not: "CANCELED" } },
        select: { createdAt: true, total: true }
      }),
      prisma.financialTransaction.findMany({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.financialTransaction.groupBy({ by: ["type"], _sum: { amount: true } }),
      // Raw query: variantes onde estoque <= minStock
      prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "ProductVariant" WHERE "stockQuantity" <= "minStock" ORDER BY "stockQuantity" ASC LIMIT 8
      `,
      prisma.customer.count(),
      prisma.order.findMany({
        where: { status: { not: "CANCELED" } },
        include: { customer: true, items: { include: { variant: { include: { product: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 5
      }),
      prisma.storeSettings.findUnique({ where: { id: 1 } })
    ]);

  const lowStock = lowStockIds.length
    ? await prisma.productVariant.findMany({
        where: { id: { in: lowStockIds.map((r) => r.id) } },
        include: { product: true },
        orderBy: { stockQuantity: "asc" }
      })
    : [];

  const revenue = transactions
    .filter((item) => item.type === "REVENUE")
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const expenses = transactions
    .filter((item) => item.type === "EXPENSE")
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const salesTotal = ordersMonth.reduce((sum, order) => sum + Number(order.total), 0);
  const estimatedCost = ordersMonth
    .flatMap((order) => order.items)
    .reduce((sum, item) => sum + Number(item.costPrice) * item.quantity, 0);

  const allRevenue = Number(allTransactionTotals.find((t) => t.type === "REVENUE")?._sum.amount ?? 0);
  const allExpenses = Number(allTransactionTotals.find((t) => t.type === "EXPENSE")?._sum.amount ?? 0);
  const initialBalance = Number(settings?.cashBalance ?? 0);
  const currentBalance = initialBalance + allRevenue - allExpenses;

  // Chart: agrupa vendas por dia local (sem problema de timezone UTC)
  const chart = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(now);
    day.setDate(now.getDate() - (6 - index));
    const key = localDateKey(day);
    const total = ordersWeek
      .filter((order) => localDateKey(new Date(order.createdAt)) === key)
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
