import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    prisma.customer.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.supplier.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.product.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.productVariant.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.order.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.orderItem.findMany(),
    prisma.installment.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.purchase.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.purchaseItem.findMany(),
    prisma.financialTransaction.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.stockMovement.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.storeSettings.findUnique({ where: { id: 1 } })
  ]);

  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    exportedBy: session.name,
    data: {
      customers,
      suppliers,
      products,
      variants: variants.map((v) => ({ ...v, costPrice: Number(v.costPrice), salePrice: Number(v.salePrice) })),
      orders: orders.map((o) => ({
        ...o,
        subtotal: Number(o.subtotal),
        discount: Number(o.discount),
        fee: Number(o.fee),
        total: Number(o.total)
      })),
      orderItems: orderItems.map((i) => ({ ...i, unitPrice: Number(i.unitPrice), costPrice: Number(i.costPrice) })),
      installments: installments.map((i) => ({ ...i, amount: Number(i.amount) })),
      purchases: purchases.map((p) => ({ ...p, freight: Number(p.freight), total: Number(p.total) })),
      purchaseItems: purchaseItems.map((i) => ({ ...i, unitCost: Number(i.unitCost) })),
      financialTransactions: transactions.map((t) => ({ ...t, amount: Number(t.amount) })),
      stockMovements: movements,
      settings: settings ?? null
    }
  };

  const filename = `backup-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
