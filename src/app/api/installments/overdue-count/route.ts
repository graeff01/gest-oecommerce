import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const count = await prisma.installment.count({
    where: {
      paidAt: null,
      dueDate: { lt: today }
    }
  });

  return NextResponse.json({ count });
}
