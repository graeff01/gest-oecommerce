import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function escape(v: unknown): string {
  const s = String(v ?? "").replace(/"/g, '""');
  return `"${s}"`;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const dateFilter = from || to ? {
    createdAt: {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {})
    }
  } : {};

  const orders = await prisma.order.findMany({
    where: dateFilter,
    include: { customer: true, items: { include: { variant: { include: { product: true } } } } },
    orderBy: { createdAt: "desc" }
  });

  const header = ["Código", "Cliente", "Canal", "Status", "Forma de Pagamento", "Subtotal", "Desconto", "Taxa", "Total", "Data"].join(",");
  const rows = orders.map((o) => [
    escape(o.code),
    escape(o.customer?.name ?? "Avulsa"),
    escape(o.channel),
    escape(o.status),
    escape(o.paymentMethod),
    escape(Number(o.subtotal).toFixed(2)),
    escape(Number(o.discount).toFixed(2)),
    escape(Number(o.fee).toFixed(2)),
    escape(Number(o.total).toFixed(2)),
    escape(o.createdAt.toISOString().slice(0, 10))
  ].join(","));

  const csv = [header, ...rows].join("\n");
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pedidos.csv"`
    }
  });
}
