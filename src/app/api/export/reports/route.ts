import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function escape(v: unknown): string {
  const s = String(v ?? "").replace(/"/g, '""');
  return `"${s}"`;
}

function brl(v: number) {
  return v.toFixed(2).replace(".", ",");
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const sheet = searchParams.get("sheet") ?? "products"; // products | channels | stock

  const dateFilter = from || to ? {
    createdAt: {
      ...(from ? { gte: new Date(`${from}T00:00:00-03:00`) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59.999-03:00`) } : {})
    }
  } : {};

  const orderFilter = { ...dateFilter, status: { not: "CANCELED" as const } };

  if (sheet === "channels") {
    const orders = await prisma.order.findMany({
      where: orderFilter,
      select: { channel: true, total: true }
    });

    const map = new Map<string, { total: number; count: number }>();
    for (const o of orders) {
      const cur = map.get(o.channel) ?? { total: 0, count: 0 };
      cur.total += Number(o.total);
      cur.count += 1;
      map.set(o.channel, cur);
    }

    const header = ["Canal", "Pedidos", "Faturamento (R$)"].join(";");
    const rows = [...map.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .map(([channel, d]) => [escape(channel), escape(d.count), escape(brl(d.total))].join(";"));

    const csv = [header, ...rows].join("\n");
    return new NextResponse("﻿" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="relatorio-canais.csv"`
      }
    });
  }

  if (sheet === "stock") {
    const variants = await prisma.productVariant.findMany({
      include: { product: true },
      orderBy: { stockQuantity: "asc" }
    });

    const header = ["Produto", "SKU", "Cor", "Tamanho", "Estoque", "Min.", "Custo (R$)", "Preço (R$)", "Valor Estoque (R$)"].join(";");
    const rows = variants.map((v) => [
      escape(v.product.name),
      escape(v.sku),
      escape(v.color),
      escape(v.size),
      escape(v.stockQuantity),
      escape(v.minStock),
      escape(brl(Number(v.costPrice))),
      escape(brl(Number(v.salePrice))),
      escape(brl(Number(v.costPrice) * v.stockQuantity))
    ].join(";"));

    const csv = [header, ...rows].join("\n");
    return new NextResponse("﻿" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="relatorio-estoque.csv"`
      }
    });
  }

  // default: products ranking
  const orders = await prisma.order.findMany({
    where: orderFilter,
    include: { items: { include: { variant: { include: { product: true } } } } }
  });

  const map = new Map<string, { name: string; quantity: number; total: number; cost: number }>();
  for (const order of orders) {
    for (const item of order.items) {
      const key = item.variant ? item.variant.product.id : `manual:${item.label ?? "avulso"}`;
      const name = item.variant ? item.variant.product.name : (item.label ?? "Item avulso");
      const cur = map.get(key) ?? { name, quantity: 0, total: 0, cost: 0 };
      cur.quantity += item.quantity;
      cur.total += Number(item.unitPrice) * item.quantity;
      cur.cost += Number(item.costPrice) * item.quantity;
      map.set(key, cur);
    }
  }

  const header = ["Produto", "Qtd. Vendida", "Faturamento (R$)", "Custo (R$)", "Margem (R$)"].join(";");
  const rows = [...map.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .map((r) => [
      escape(r.name),
      escape(r.quantity),
      escape(brl(r.total)),
      escape(brl(r.cost)),
      escape(brl(r.total - r.cost))
    ].join(";"));

  const csv = [header, ...rows].join("\n");
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="relatorio-produtos.csv"`
    }
  });
}
