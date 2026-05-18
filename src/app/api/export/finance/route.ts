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
  if (!["ADMIN", "FINANCE"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const dateFilter = from || to ? {
    createdAt: {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {})
    }
  } : {};

  const transactions = await prisma.financialTransaction.findMany({
    where: { deletedAt: null, ...dateFilter },
    orderBy: { createdAt: "desc" }
  });

  const fmtBRT = (d: Date | null | undefined) =>
    d ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(d) : "";

  const header = ["Tipo", "Título", "Categoria", "Valor", "Forma de Pagamento", "Vencimento", "Pago em", "Data de criação"].join(",");
  const rows = transactions.map((t) => [
    escape(t.type === "REVENUE" ? "Receita" : "Gasto"),
    escape(t.title),
    escape(t.category),
    escape(Number(t.amount).toFixed(2)),
    escape(t.paymentMethod ?? ""),
    escape(fmtBRT(t.dueDate)),
    escape(fmtBRT(t.paidAt)),
    escape(fmtBRT(t.createdAt))
  ].join(","));

  const csv = [header, ...rows].join("\n");
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="financeiro.csv"`,
      "Cache-Control": "no-store"
    }
  });
}
