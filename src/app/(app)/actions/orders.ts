"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const decimal = z.coerce.number().min(0);

export async function createOrderAction(formData: FormData) {
  const user = await requireRole(["ADMIN", "SALES", "FINANCE"]);

  const raw = Object.fromEntries(formData);

  // itens do carrinho: JSON enviado pelo form client-side
  // variantId é null para itens avulsos (produto sem cadastro)
  const itemsRaw = z.string().min(1).parse(raw.items);
  const cartItems = z.array(z.object({
    variantId: z.string().nullable().optional(),
    label: z.string().optional(),
    unitPrice: z.coerce.number().min(0).optional(),
    quantity: z.coerce.number().int().min(1)
  })).min(1).parse(JSON.parse(itemsRaw));

  // datas de parcelas: JSON ou vazio
  const dueDatesRaw = typeof raw.dueDates === "string" && raw.dueDates ? raw.dueDates : null;
  const dueDates: string[] | null = dueDatesRaw ? JSON.parse(dueDatesRaw) : null;

  const parsed = z.object({
    customerId: z.string().optional(),
    discount: decimal.default(0),
    fee: decimal.default(0),
    paymentMethod: z.enum(["PIX", "CREDIT_CARD", "DEBIT_CARD", "CASH", "BANK_SLIP", "MARKETPLACE", "CREDIARIO"]),
    channel: z.string().min(1),
    notes: z.string().optional()
  }).parse(raw);

  const isCrediario = parsed.paymentMethod === "CREDIARIO";

  if (isCrediario) {
    if (!parsed.customerId) throw new Error("Crediário exige selecionar um cliente.");
    if (!dueDates || dueDates.length === 0) throw new Error("Informe as datas de vencimento das parcelas.");
  }

  await prisma.$transaction(async (tx) => {
    const catalogItems = cartItems.filter((i) => i.variantId);
    const manualItems  = cartItems.filter((i) => !i.variantId);

    // busca variantes cadastradas de uma vez
    const variantIds = catalogItems.map((i) => i.variantId as string);
    const variantsDb = variantIds.length
      ? await tx.productVariant.findMany({ where: { id: { in: variantIds } } })
      : [];
    const variantMap = new Map(variantsDb.map((v) => [v.id, v]));

    // valida estoque e calcula subtotal
    let subtotal = 0;
    for (const item of catalogItems) {
      const v = variantMap.get(item.variantId as string);
      if (!v) throw new Error("Produto não encontrado.");
      if (v.stockQuantity < item.quantity) throw new Error(`Estoque insuficiente para ${v.sku}.`);
      subtotal += Number(v.salePrice) * item.quantity;
    }
    // itens avulsos: usa o preço informado no form
    for (const item of manualItems) {
      subtotal += (item.unitPrice ?? 0) * item.quantity;
    }

    const total = subtotal - parsed.discount + parsed.fee;
    if (total < 0) throw new Error("O desconto não pode deixar o total da venda negativo.");

    const code = `PED-${randomUUID().slice(0, 8).toUpperCase()}`;

    // baixa atômica de estoque só para itens cadastrados
    for (const item of catalogItems) {
      const stockUpdate = await tx.productVariant.updateMany({
        where: { id: item.variantId as string, stockQuantity: { gte: item.quantity } },
        data: { stockQuantity: { decrement: item.quantity } }
      });
      if (stockUpdate.count !== 1) throw new Error(`Estoque insuficiente para uma das variações.`);
    }

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
          create: [
            ...catalogItems.map((item) => {
              const v = variantMap.get(item.variantId as string)!;
              return {
                variantId: item.variantId as string,
                quantity: item.quantity,
                unitPrice: v.salePrice,
                costPrice: v.costPrice
              };
            }),
            ...manualItems.map((item) => ({
              variantId: null,
              label: item.label ?? "Item avulso",
              quantity: item.quantity,
              unitPrice: item.unitPrice ?? 0,
              costPrice: 0
            }))
          ]
        }
      }
    });

    // movimentações de estoque apenas para itens cadastrados
    for (const item of catalogItems) {
      await tx.stockMovement.create({
        data: { variantId: item.variantId as string, userId: user.id, type: "SALE", quantity: item.quantity, reason: `Venda ${code}` }
      });
    }

    if (isCrediario && dueDates && dueDates.length > 0) {
      const count = dueDates.length;
      const cents = Math.round(total * 100);
      const baseCents = Math.floor(cents / count);
      const remainder = cents - baseCents * count;

      await tx.installment.createMany({
        data: dueDates.map((dateStr, i) => ({
          orderId: order.id,
          sequence: i + 1,
          totalCount: count,
          dueDate: new Date(dateStr),
          amount: (baseCents + (i === count - 1 ? remainder : 0)) / 100
        }))
      });
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
  revalidatePath("/produtos");
  revalidatePath("/clientes");
  revalidatePath("/movimentacoes");
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

    // Devolve estoque apenas para itens com variante cadastrada
    for (const item of order.items) {
      if (!item.variantId) continue; // item avulso: sem estoque para devolver
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

    // Estorna o lançamento financeiro da venda (pagamentos à vista)
    if (order.paymentMethod !== "CREDIARIO") {
      await tx.financialTransaction.deleteMany({
        where: { title: `Venda ${order.code}`, type: "REVENUE" }
      });
    }

    await tx.auditLog.create({
      data: { userId: user.id, action: "CANCEL_ORDER", entity: "Order", entityId: id }
    });
  });

  revalidatePath("/vendas");
  revalidatePath("/clientes");
  revalidatePath("/financeiro");
  revalidatePath("/produtos");
  revalidatePath("/");
}

export async function updateOrderAction(_: unknown, formData: FormData) {
  await requireRole(["ADMIN", "SALES"]);
  const parsed = z.object({
    id: z.string().min(1),
    channel: z.string().min(1),
    status: z.enum(["NEW", "PAID", "PICKING", "SHIPPED", "DELIVERED"]).optional(),
    paymentMethod: z.enum(["PIX", "CREDIT_CARD", "DEBIT_CARD", "CASH", "BANK_SLIP", "MARKETPLACE", "CREDIARIO"]).optional(),
    customerId: z.string().optional(),
    discount: z.coerce.number().min(0).default(0),
    fee: z.coerce.number().min(0).default(0),
    notes: z.string().optional()
  }).safeParse(Object.fromEntries(formData));

  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { id, channel, status, paymentMethod, customerId, discount, fee, notes } = parsed.data;

  const order = await prisma.order.findUnique({ where: { id }, select: { subtotal: true, status: true } });
  if (!order) return { error: "Pedido não encontrado." };
  if (order.status === "CANCELED") return { error: "Não é possível editar um pedido cancelado." };

  const total = Math.max(0, Number(order.subtotal) - discount + fee);

  await prisma.order.update({
    where: { id },
    data: {
      channel,
      discount,
      fee,
      total,
      notes: notes || null,
      ...(status ? { status } : {}),
      ...(paymentMethod ? { paymentMethod } : {}),
      ...(customerId !== undefined ? { customerId: customerId || null } : {})
    }
  });

  revalidatePath("/vendas");
  revalidatePath("/clientes");
  revalidatePath("/");
  return { success: true };
}

export async function updateOrderStatusAction(formData: FormData) {
  const user = await requireRole(["ADMIN", "SALES"]);
  const { id, status } = z.object({
    id: z.string().min(1),
    status: z.enum(["NEW", "PAID", "PICKING", "SHIPPED", "DELIVERED", "CANCELED"])
  }).parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id }, data: { status } });
    await tx.auditLog.create({
      data: { userId: user.id, action: "UPDATE_ORDER_STATUS", entity: "Order", entityId: id, metadata: { status } }
    });
  });

  revalidatePath("/vendas");
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

    // Quando todas parcelas pagas, marca pedido como PAID
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

export async function returnOrderItemAction(
  _prev: { success?: true; error?: string } | null,
  formData: FormData
): Promise<{ success?: true; error?: string }> {
  let user: Awaited<ReturnType<typeof requireRole>>;
  try {
    user = await requireRole(["ADMIN", "SALES"]);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Acesso negado." };
  }

  const raw = Object.fromEntries(formData);
  const parseResult = z.object({
    orderId: z.string().min(1),
    itemId: z.string().min(1),
    quantity: z.coerce.number().int().min(1),
    reason: z.string().min(1)
  }).safeParse(raw);

  if (!parseResult.success) {
    return { error: parseResult.error.errors[0].message };
  }

  const parsed = parseResult.data;

  try {
    await prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findUniqueOrThrow({
        where: { id: parsed.itemId },
        include: { order: true }
      });

      if (item.orderId !== parsed.orderId) throw new Error("Item não pertence ao pedido informado.");
      if (parsed.quantity > item.quantity) throw new Error(`Quantidade a devolver (${parsed.quantity}) não pode ser maior que a quantidade do item (${item.quantity}).`);

      const refundAmount = Number(item.unitPrice) * parsed.quantity;

      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: { increment: parsed.quantity } }
        });
        await tx.stockMovement.create({
          data: {
            variantId: item.variantId,
            userId: user.id,
            type: "RETURN",
            quantity: parsed.quantity,
            reason: `Devolução ${item.order.code}: ${parsed.reason}`
          }
        });
      }

      await tx.financialTransaction.create({
        data: {
          type: "EXPENSE",
          title: `Devolução ${item.order.code}`,
          category: "Devolução",
          amount: refundAmount,
          paidAt: new Date(),
          notes: parsed.reason
        }
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "RETURN_ORDER_ITEM",
          entity: "OrderItem",
          entityId: item.id,
          metadata: { orderId: parsed.orderId, quantity: parsed.quantity, reason: parsed.reason }
        }
      });
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao processar devolução." };
  }

  revalidatePath("/vendas");
  revalidatePath("/clientes");
  revalidatePath("/produtos");
  revalidatePath("/financeiro");
  revalidatePath("/");
  return { success: true };
}

export async function payManyInstallmentsAction(formData: FormData) {
  const user = await requireRole(["ADMIN", "SALES", "FINANCE"]);
  const raw = Object.fromEntries(formData);

  const idsRaw = z.string().min(1).parse(raw.installmentIds);
  const ids = z.array(z.string().min(1)).min(1).parse(JSON.parse(idsRaw));
  const method = z.enum(["PIX", "CREDIT_CARD", "DEBIT_CARD", "CASH", "BANK_SLIP", "MARKETPLACE"])
    .default("PIX")
    .parse(raw.paymentMethod ?? "PIX");

  await prisma.$transaction(async (tx) => {
    const installments = await tx.installment.findMany({
      where: { id: { in: ids }, paidAt: null },
      include: { order: { include: { installments: true } } }
    });

    if (installments.length === 0) throw new Error("Nenhuma parcela em aberto encontrada.");

    const now = new Date();

    for (const inst of installments) {
      await tx.installment.update({ where: { id: inst.id }, data: { paidAt: now, paymentMethod: method } });

      await tx.financialTransaction.create({
        data: {
          type: "REVENUE",
          title: `Parcela ${inst.sequence}/${inst.totalCount} - ${inst.order.code}`,
          category: "Crediário",
          amount: inst.amount,
          paymentMethod: method,
          paidAt: now
        }
      });

      const remaining = inst.order.installments.filter((i) => i.id !== inst.id && !i.paidAt && !ids.includes(i.id)).length;
      if (remaining === 0) {
        await tx.order.update({ where: { id: inst.orderId }, data: { status: "PAID" } });
      }

      await tx.auditLog.create({
        data: { userId: user.id, action: "PAY_INSTALLMENT", entity: "Installment", entityId: inst.id }
      });
    }
  });

  revalidatePath("/clientes");
  revalidatePath("/vendas");
  revalidatePath("/financeiro");
  revalidatePath("/");
}
