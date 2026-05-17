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
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const fortyFiveDaysAgo = new Date(now);
  fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Janela dos últimos 7 dias para o chart
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [ordersMonth, ordersWeek, transactions, allTransactionTotals, lowStockIds, customers, customerRows, productRows, orderItems, openInstallments, recentOrders, settings] =
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
      prisma.customer.findMany({
        select: {
          id: true,
          name: true,
          phone: true,
          orders: {
            where: { status: { not: "CANCELED" } },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true, code: true, total: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 60
      }),
      prisma.product.findMany({
        where: { status: "ACTIVE" },
        include: { variants: true },
        orderBy: { createdAt: "desc" },
        take: 120
      }),
      prisma.orderItem.findMany({
        where: {
          variantId: { not: null },
          order: { status: { not: "CANCELED" }, createdAt: { gte: ninetyDaysAgo } }
        },
        select: {
          quantity: true,
          variantId: true,
          order: { select: { createdAt: true } }
        }
      }),
      prisma.installment.findMany({
        where: { paidAt: null },
        include: { order: { select: { code: true, customer: { select: { name: true, phone: true } } } } },
        orderBy: { dueDate: "asc" },
        take: 12
      }),
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

  const salesByVariant = new Map<string, { sold30: number; sold90: number; lastSoldAt: Date | null }>();
  for (const item of orderItems) {
    if (!item.variantId) continue;
    const current = salesByVariant.get(item.variantId) ?? { sold30: 0, sold90: 0, lastSoldAt: null };
    if (item.order.createdAt >= thirtyDaysAgo) current.sold30 += item.quantity;
    current.sold90 += item.quantity;
    if (!current.lastSoldAt || item.order.createdAt > current.lastSoldAt) current.lastSoldAt = item.order.createdAt;
    salesByVariant.set(item.variantId, current);
  }

  const campaignProducts = productRows
    .map((product) => {
      const stock = product.variants.reduce((sum, variant) => sum + variant.stockQuantity, 0);
      const minPrice = product.variants.length ? Math.min(...product.variants.map((variant) => Number(variant.salePrice))) : 0;
      const sales = product.variants.reduce(
        (acc, variant) => {
          const current = salesByVariant.get(variant.id);
          acc.sold30 += current?.sold30 ?? 0;
          acc.sold90 += current?.sold90 ?? 0;
          if (current?.lastSoldAt && (!acc.lastSoldAt || current.lastSoldAt > acc.lastSoldAt)) acc.lastSoldAt = current.lastSoldAt;
          return acc;
        },
        { sold30: 0, sold90: 0, lastSoldAt: null as Date | null }
      );
      const daysWithoutSale = sales.lastSoldAt
        ? Math.floor((now.getTime() - sales.lastSoldAt.getTime()) / 86_400_000)
        : null;
      return {
        id: product.id,
        name: product.name,
        category: product.category,
        stock,
        minPrice,
        sold30: sales.sold30,
        sold90: sales.sold90,
        daysWithoutSale
      };
    })
    .filter((product) => product.stock > 0);

  const stagnantProducts = campaignProducts
    .filter((product) => product.sold30 === 0)
    .sort((a, b) => (b.daysWithoutSale ?? 9999) - (a.daysWithoutSale ?? 9999))
    .slice(0, 5);

  const bestSellers = campaignProducts
    .filter((product) => product.sold30 > 0)
    .sort((a, b) => b.sold30 - a.sold30)
    .slice(0, 5);

  const inactiveCustomers = customerRows
    .map((customer) => {
      const lastOrder = customer.orders[0] ?? null;
      const daysInactive = lastOrder
        ? Math.floor((now.getTime() - lastOrder.createdAt.getTime()) / 86_400_000)
        : null;
      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        daysInactive,
        lastOrderCode: lastOrder?.code ?? null,
        lastOrderTotal: lastOrder ? Number(lastOrder.total) : null
      };
    })
    .filter((customer) => customer.daysInactive === null || customer.daysInactive >= 45)
    .slice(0, 5);

  const overdueInstallments = openInstallments.filter((installment) => installment.dueDate < today);
  const todayInstallments = openInstallments.filter((installment) => installment.dueDate >= today && installment.dueDate < tomorrow);
  const overdueTotal = overdueInstallments.reduce((sum, installment) => sum + Number(installment.amount), 0);
  const todayTotal = todayInstallments.reduce((sum, installment) => sum + Number(installment.amount), 0);

  const onboarding = [
    { key: "settings", label: "Configurar dados da loja", done: Boolean(settings?.storeName) },
    { key: "products", label: "Cadastrar primeiros produtos", done: productRows.length >= 5 },
    { key: "customers", label: "Cadastrar clientes", done: customers >= 3 },
    { key: "sales", label: "Registrar primeira venda", done: recentOrders.length > 0 },
    { key: "credit", label: "Conferir cobranças", done: openInstallments.length > 0 || recentOrders.length > 0 },
    { key: "reports", label: "Acompanhar lucro e estoque", done: ordersMonth.length > 0 }
  ];

  const dayActions = [
    overdueInstallments.length ? {
      type: "danger" as const,
      title: "Cobrar parcelas vencidas",
      detail: `${overdueInstallments.length} em atraso · ${overdueTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
      href: "/credario"
    } : null,
    todayInstallments.length ? {
      type: "warning" as const,
      title: "Cobrar vencimentos de hoje",
      detail: `${todayInstallments.length} hoje · ${todayTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
      href: "/credario"
    } : null,
    lowStock.length ? {
      type: "warning" as const,
      title: "Repor estoque baixo",
      detail: `${lowStock.length} SKU${lowStock.length === 1 ? "" : "s"} abaixo do minimo`,
      href: "/produtos"
    } : null,
    stagnantProducts.length ? {
      type: "primary" as const,
      title: "Divulgar produto parado",
      detail: `${stagnantProducts.length} produto${stagnantProducts.length === 1 ? "" : "s"} sem giro em 30 dias`,
      href: "/produtos"
    } : null,
    inactiveCustomers.length ? {
      type: "success" as const,
      title: "Recuperar clientes parados",
      detail: `${inactiveCustomers.length} cliente${inactiveCustomers.length === 1 ? "" : "s"} para chamar no WhatsApp`,
      href: "/clientes"
    } : null,
    !recentOrders.length ? {
      type: "primary" as const,
      title: "Registrar primeira venda",
      detail: "Comece pelo fluxo de venda rapida",
      href: "/vendas"
    } : null
  ].filter(Boolean) as Array<{ type: "danger" | "warning" | "primary" | "success"; title: string; detail: string; href: string }>;

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
    recentOrders,
    central: {
      actions: dayActions,
      onboarding,
      campaigns: {
        stagnantProducts,
        bestSellers,
        inactiveCustomers
      },
      credit: {
        overdueCount: overdueInstallments.length,
        overdueTotal,
        todayCount: todayInstallments.length,
        todayTotal
      }
    }
  };
}
