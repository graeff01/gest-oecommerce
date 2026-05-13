"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const decimal = z.coerce.number().min(0);

export async function createOrderAction(formData: FormData) {
  const user = await requireRole(["ADMIN", "SALES", "FINANCE"]);
  const parsed = z.object({
    customerId: z.string().optional(),
    variantId: z.string().min(1),
    quantity: z.coerce.number().int().min(1),
    discount: decimal.default(0),
    fee: decimal.default(0),
    paymentMethod: z.enum(["PIX", "CREDIT_CARD", "DEBIT_CARD", "CASH", "BANK_SLIP", "MARKETPLACE", "CREDIARIO"]),
    channel: z.string().min(2),
    notes: z.string().optional(),
    installmentCount: z.coerce.number().int().min(1).max(36).optional(),
    firstDueDate: z.string().optional()
  }).parse(Object.fromEntries(formData));

  const isCrediario = parsed.paymentMethod === "CREDIARIO";

  if (isCrediario) {
    if (!parsed.customerId) throw new Error("Crediário exige selecionar um cliente.");
    if (!parsed.installmentCount) throw new Error("Informe a quantidade de parcelas para o crediário.");
  }

  await prisma.$transaction(async (tx) => {
    const variant = await tx.productVariant.findUniqueOrThrow({
      where: { id: parsed.variantId },
      include: { product: true }
    });

    if (variant.stockQuantity < parsed.quantity) throw new Error("Estoque insuficiente para esta venda.");

    const subtotal = Number(variant.salePrice) * parsed.quantity;
    const total = subtotal - parsed.discount + parsed.fee;

    if (total < 0) throw new Error("O desconto não pode deixar o total da venda negativo.");

    const code = `PED-${randomUUID().slice(0, 8).toUpperCase()}`;

    const stockUpdate = await tx.productVariant.updateMany({
      where: { id: variant.id, stockQuantity: { gte: parsed.quantity } },
      data: { stockQuantity: { decrement: parsed.quantity } }
    });

    if (stockUpdate.count !== 1) throw new Error("Estoque insuficiente para esta venda.");

    const order = await tx.order.create({
      data: {
        code,
        customerId: parsed.customerId || null,
        channel: parsed.channel,
        status: isCrediario ? "NEW" : "PAID",
        paymentMethod: parsed.paymentMethod,
        subtotal,
        discount: parsed.discount,
        fee: parsed.fee,
        total,
        notes: parsed.notes,
        items: {
          create: {
            variantId: variant.id,
            quantity: parsed.quantity,
            unitPrice: variant.salePrice,
            costPrice: variant.costPrice
          }
        }
      }
    });

    await tx.stockMovement.create({
      data: { variantId: variant.id, userId: user.id, type: "SALE", quantity: parsed.quantity, reason: `Venda ${code}` }
    });

    if (isCrediario && parsed.installmentCount) {
      const count = parsed.installmentCount;
      const baseDue = parsed.firstDueDate ? new Date(parsed.firstDueDate) : new Date();
      const cents = Math.round(total * 100);
      const baseCents = Math.floor(cents / count);
      const remainder = cents - baseCents * count;

      const installments = Array.from({ length: count }, (_, i) => {
        const due = new Date(baseDue);
        due.setMonth(due.getMonth() + i);
        return {
          orderId: order.id,
          sequence: i + 1,
          totalCount: count,
          dueDate: due,
          amount: (baseCents + (i === count - 1 ? remainder : 0)) / 100
        };
      });

      await tx.installment.createMany({ data: installments });
    } else {
      await tx.financialTransaction.create({
        data: {
          type: "REVENUE",
          title: `Venda ${code}`,
          category: "Vendas",
          amount: total,
          paymentMethod: parsed.paymentMethod,
          paidAt: new Date()
        }
      });
    }

    await tx.auditLog.create({
      data: { userId: user.id, action: "CREATE_ORDER", entity: "Order", entityId: order.id }
    });
  });

  revalidatePath("/vendas");
  revalidatePath("/financeiro");
  revalidatePath("/clientes");
  revalidatePath("/");
}

export async function cancelOrderAction(formData: FormData) {
  const user = await requireRole(["ADMIN", "SALES"]);
  const { id } = z.object({ id: z.string().min(1) }).parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id },
      include: { items: true, installments: true }
    });

    if (order.status === "CANCELED") throw new Error("Pedido já está cancelado.");
    if (order.status === "DELIVERED") throw new Error("Não é possível cancelar um pedido já entregue.");

    const hasAnyPaid = order.installments.some((i) => i.paidAt !== null);
    if (hasAnyPaid) throw new Error("Não é possível cancelar um pedido com parcelas já pagas.");

    await tx.order.update({ where: { id }, data: { status: "CANCELED" } });

    for (const item of order.items) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stockQuantity: { increment: item.quantity } }
      });
      await tx.stockMovement.create({
        data: {
          variantId: item.variantId,
          userId: user.id,
          type: "RETURN",
          quantity: item.quantity,
          reason: `Cancelamento ${order.code}`
        }
      });
    }

    await tx.auditLog.create({
      data: { userId: user.id, action: "CANCEL_ORDER", entity: "Order", entityId: id }
    });
  });

  revalidatePath("/vendas");
  revalidatePath("/clientes");
  revalidatePath("/");
}

export async function payInstallmentAction(formData: FormData) {
  const user = await requireRole(["ADMIN", "SALES", "FINANCE"]);
  const parsed = z.object({
    installmentId: z.string().min(1),
    paymentMethod: z.enum(["PIX", "CREDIT_CARD", "DEBIT_CARD", "CASH", "BANK_SLIP", "MARKETPLACE"]).optional().or(z.literal(""))
  }).parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    const installment = await tx.installment.findUniqueOrThrow({
      where: { id: parsed.installmentId },
      include: { order: { include: { installments: true } } }
    });

    if (installment.paidAt) throw new Error("Esta parcela já foi paga.");

    const method = (parsed.paymentMethod || "CASH") as "PIX" | "CREDIT_CARD" | "DEBIT_CARD" | "CASH" | "BANK_SLIP" | "MARKETPLACE";
    const now = new Date();

    await tx.installment.update({
      where: { id: installment.id },
      data: { paidAt: now, paymentMethod: method }
    });

    await tx.financialTransaction.create({
      data: {
        type: "REVENUE",
        title: `Parcela ${installment.sequence}/${installment.totalCount} - ${installment.order.code}`,
        category: "Crediário",
        amount: installment.amount,
        paymentMethod: method,
        paidAt: now
      }
    });

    const remaining = installment.order.installments.filter((i) => i.id !== installment.id && !i.paidAt).length;
    if (remaining === 0) {
      await tx.order.update({ where: { id: installment.orderId }, data: { status: "PAID" } });
    }

    await tx.auditLog.create({
      data: { userId: user.id, action: "PAY_INSTALLMENT", entity: "Installment", entityId: installment.id }
    });
  });

  revalidatePath("/clientes");
  revalidatePath("/vendas");
  revalidatePath("/financeiro");
  revalidatePath("/");
}
