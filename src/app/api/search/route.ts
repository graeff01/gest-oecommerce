import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ customers: [], orders: [], products: [] });

  const term = q.toLowerCase();

  const [customers, orders, products] = await Promise.all([
    prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { phone: { contains: term, mode: "insensitive" } },
          { email: { contains: term, mode: "insensitive" } }
        ]
      },
      select: { id: true, name: true, phone: true, email: true },
      take: 5
    }),
    prisma.order.findMany({
      where: {
        OR: [
          { code: { contains: term, mode: "insensitive" } },
          { customer: { name: { contains: term, mode: "insensitive" } } }
        ]
      },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { category: { contains: term, mode: "insensitive" } },
          { brand: { contains: term, mode: "insensitive" } },
          { variants: { some: { sku: { contains: term, mode: "insensitive" } } } }
        ]
      },
      select: { id: true, name: true, category: true },
      take: 5
    })
  ]);

  return NextResponse.json({ customers, orders, products });
}
