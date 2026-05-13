"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const decimal = z.coerce.number().min(0);

export async function createFinancialTransactionAction(formData: FormData) {
  await requireRole(["ADMIN", "FINANCE"]);
  const parsed = z.object({
    type: z.enum(["REVENUE", "EXPENSE"]),
    title: z.string().min(2),
    category: z.string().min(2),
    amount: decimal,
    paymentMethod: z.enum(["PIX", "CREDIT_CARD", "DEBIT_CARD", "CASH", "BANK_SLIP", "MARKETPLACE"]).optional().or(z.literal("")),
    dueDate: z.string().optional(),
    paidAt: z.string().optional(),
    notes: z.string().optional()
  }).parse(Object.fromEntries(formData));

  await prisma.financialTransaction.create({
    data: {
      type: parsed.type,
      title: parsed.title,
      category: parsed.category,
      amount: parsed.amount,
      paymentMethod: parsed.paymentMethod || null,
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
      paidAt: parsed.paidAt ? new Date(parsed.paidAt) : null,
      notes: parsed.notes
    }
  });

  revalidatePath("/financeiro");
  revalidatePath("/");
}

export async function deleteFinancialTransactionAction(formData: FormData) {
  const user = await requireRole(["ADMIN", "FINANCE"]);
  const { id } = z.object({ id: z.string().min(1) }).parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    await tx.financialTransaction.delete({ where: { id } });
    await tx.auditLog.create({
      data: { userId: user.id, action: "DELETE_TRANSACTION", entity: "FinancialTransaction", entityId: id }
    });
  });

  revalidatePath("/financeiro");
  revalidatePath("/");
}

export async function createPurchaseAction(formData: FormData) {
  const user = await requireRole(["ADMIN", "STOCK"]);
  const parsed = z.object({
    supplierId: z.string().optional(),
    variantId: z.string().min(1),
    quantity: z.coerce.number().int().min(1),
    unitCost: decimal,
    freight: decimal.default(0)
  }).parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    const code = `CMP-${randomUUID().slice(0, 8).toUpperCase()}`;
    const total = parsed.unitCost * parsed.quantity + parsed.freight;

    const purchase = await tx.purchase.create({
      data: {
        code,
        supplierId: parsed.supplierId || null,
        freight: parsed.freight,
        total,
        receivedAt: new Date(),
        items: {
          create: {
            variantId: parsed.variantId,
            quantity: parsed.quantity,
            unitCost: parsed.unitCost
          }
        }
      }
    });

    await tx.productVariant.update({
      where: { id: parsed.variantId },
      data: { stockQuantity: { increment: parsed.quantity }, costPrice: parsed.unitCost }
    });

    await tx.stockMovement.create({
      data: { variantId: parsed.variantId, userId: user.id, type: "IN", quantity: parsed.quantity, reason: `Compra ${code}` }
    });

    await tx.financialTransaction.create({
      data: { type: "EXPENSE", title: `Compra ${code}`, category: "Mercadorias", amount: total, paidAt: new Date() }
    });

    await tx.auditLog.create({
      data: { userId: user.id, action: "CREATE_PURCHASE", entity: "Purchase", entityId: purchase.id }
    });
  });

  revalidatePath("/compras");
  revalidatePath("/financeiro");
  revalidatePath("/");
}
