import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function escape(v: unknown): string {
  const s = String(v ?? "").replace(/"/g, '""');
  return `"${s}"`;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customers = await prisma.customer.findMany({
    include: { orders: true },
    orderBy: { name: "asc" }
  });

  const header = ["Nome", "E-mail", "Telefone", "CPF/CNPJ", "Endereço", "Total de Pedidos", "Total Gasto", "Cadastrado em"].join(",");
  const rows = customers.map((c) => {
    const totalSpent = c.orders.reduce((s, o) => s + Number(o.total), 0);
    return [
      escape(c.name),
      escape(c.email),
      escape(c.phone),
      escape(c.document),
      escape(c.address),
      escape(c.orders.length),
      escape(totalSpent.toFixed(2)),
      escape(c.createdAt.toISOString().slice(0, 10))
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clientes.csv"`
    }
  });
}
