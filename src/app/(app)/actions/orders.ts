"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDateBRT } from "@/lib/format";

const decimal = z.coerce.number().min(0);

export async function createOrderAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  let user: Awaited<ReturnType<typeof requireRole>>;
  try {
    user = await requireRole(["ADMIN", "SALES", "FINANCE"]);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Acesso negado." };
  }

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
    if (!parsed.customerId) return { error: "Crediário exige selecionar um cliente." };
    if (!dueDates || dueDates.length === 0) return { error: "Informe as datas de vencimento das parcelas." };
  }

  try {
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
      if (!item.unitPrice || item.unitPrice <= 0) throw new Error(`Item "${item.label ?? "avulso"}" precisa de um preço maior que zero.`);
      subtotal += item.unitPrice * item.quantity;
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
          dueDate: parseDateBRT(dateStr),
          amount: (baseCents + (i === count - 1 ? remainder : 0)) / 100
        }))
      });

      // lança parcelas como receitas previstas (a receber) no financeiro
      await tx.financialTransaction.createMany({
        data: dueDates.map((dateStr, i) => {
          const amount = (baseCents + (i === count - 1 ? remainder : 0)) / 100;
          return {
            type: "REVENUE" as const,
            title: `Parcela ${i + 1}/${count} - ${code}`,
            category: "Crediário",
            amount,
            dueDate: parseDateBRT(dateStr),
            paidAt: null
          };
        })
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
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao registrar venda. Tente novamente." };
  }

  revalidatePath("/vendas");
  revalidatePath("/financeiro");
  revalidatePath("/produtos");
  revalidatePath("/clientes");
  revalidatePath("/credario");
  revalidatePath("/movimentacoes");
  revalidatePath("/");
  return { success: true };
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

    await tx.order.update({ where: { id }, data: { status: "CANCELED" } });

    // Devolve estoque apenas para itens com variante cadastrada
    for (const item of order.items) {
      if (!item.variantId) continue;
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

    if (order.paymentMethod === "CREDIARIO") {
      // remove lançamentos previstos de cada parcela em aberto usando match fuzzy
      // (cobre casos em que totalCount foi editado e o título antigo não existe mais)
      const unpaidInstallments = order.installments.filter((i) => i.paidAt === null);
      for (const inst of unpaidInstallments) {
        await tx.financialTransaction.deleteMany({
          where: {
            category: "Crediário",
            paidAt: null,
            OR: [
              { title: `Parcela ${inst.sequence}/${inst.totalCount} - ${order.code}` },
              { title: { startsWith: `Parcela ${inst.sequence}/`, endsWith: `- ${order.code}` } }
            ]
          }
        });
      }

      // estorna parcelas que já foram pagas
      const paidInstallments = order.installments.filter((i) => i.paidAt !== null);
      if (paidInstallments.length > 0) {
        const paidTotal = paidInstallments.reduce((s, i) => s + Math.round(Number(i.amount) * 100), 0) / 100;
        await tx.financialTransaction.create({
          data: {
            type: "EXPENSE",
            title: `Estorno cancelamento ${order.code}`,
            category: "Estorno",
            amount: paidTotal,
            paidAt: new Date(),
            notes: `${paidInstallments.length} parcela(s) estornada(s)`
          }
        });
      }
    } else {
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
  revalidatePath("/credario");
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
    notes: z.string().optional(),
    createdAt: z.string().optional()
  }).safeParse(Object.fromEntries(formData));

  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { id, channel, status, paymentMethod, customerId, discount, fee, notes, createdAt } = parsed.data;

  // valida a data se informada
  let parsedCreatedAt: Date | undefined;
  if (createdAt) {
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return { error: "Data do pedido inválida." };
    parsedCreatedAt = d;
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { installments: true, _count: { select: { installments: { where: { paidAt: null } } } } }
  });
  if (!order) return { error: "Pedido não encontrado." };
  if (order.status === "CANCELED") return { error: "Não é possível editar um pedido cancelado." };

  // Impede trocar método de pagamento de crediário para outro enquanto houver parcelas em aberto
  if (order.paymentMethod === "CREDIARIO" && paymentMethod && paymentMethod !== "CREDIARIO") {
    const openCount = order._count.installments;
    if (openCount > 0) {
      return { error: `Não é possível alterar o método de pagamento: este pedido tem ${openCount} parcela(s) em aberto. Quite ou remova as parcelas antes.` };
    }
  }

  const rawTotal = Number(order.subtotal) - discount + fee;
  if (rawTotal < 0) return { error: `O desconto (${discount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}) não pode ser maior que o subtotal mais taxas (${(Number(order.subtotal) + fee).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}).` };
  const newTotal = rawTotal;
  const oldTotal = Number(order.total);
  const diff = Math.round((newTotal - oldTotal) * 100) / 100;

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: {
        channel,
        discount,
        fee,
        total: newTotal,
        notes: notes || null,
        ...(parsedCreatedAt ? { createdAt: parsedCreatedAt } : {}),
        ...(status ? { status } : {}),
        ...(paymentMethod ? { paymentMethod } : {}),
        ...(customerId !== undefined ? { customerId: customerId || null } : {})
      }
    });

    // ajusta financeiro apenas se o total mudou e o pedido já foi pago (não crediário)
    if (Math.abs(diff) >= 0.01 && order.paymentMethod !== "CREDIARIO" && (order.status === "PAID" || order.status === "DELIVERED" || order.status === "SHIPPED" || order.status === "PICKING")) {
      if (diff > 0) {
        await tx.financialTransaction.create({
          data: {
            type: "REVENUE",
            title: `Ajuste ${order.code}`,
            category: "Ajuste de venda",
            amount: diff,
            paidAt: new Date(),
            notes: `Acréscimo de ${diff.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} após edição`
          }
        });
      } else {
        await tx.financialTransaction.create({
          data: {
            type: "EXPENSE",
            title: `Ajuste ${order.code}`,
            category: "Ajuste de venda",
            amount: Math.abs(diff),
            paidAt: new Date(),
            notes: `Desconto de ${Math.abs(diff).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} após edição`
          }
        });
      }
    }
  });

  revalidatePath("/vendas");
  revalidatePath("/clientes");
  revalidatePath("/financeiro");
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

    const title = `Parcela ${installment.sequence}/${installment.totalCount} - ${installment.order.code}`;

    // busca pelo título exato ou por qualquer variação de totalCount (caso tenha sido editado)
    const existing = await tx.financialTransaction.findFirst({
      where: {
        category: "Crediário",
        paidAt: null,
        deletedAt: null,
        OR: [
          { title },
          { title: { startsWith: `Parcela ${installment.sequence}/`, endsWith: `- ${installment.order.code}` } }
        ]
      }
    });
    if (existing) {
      await tx.financialTransaction.update({
        where: { id: existing.id },
        data: { paidAt: now, paymentMethod: method, title }
      });
    } else {
      await tx.financialTransaction.create({
        data: { type: "REVENUE", title, category: "Crediário", amount: installment.amount, paymentMethod: method, paidAt: now }
      });
    }

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
  revalidatePath("/credario");
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

      // Atualiza total do pedido subtraindo o valor devolvido (mínimo R$0,00)
      const newOrderTotal = Math.max(0, Number(item.order.total) - refundAmount);
      await tx.order.update({
        where: { id: parsed.orderId },
        data: { total: newOrderTotal }
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "RETURN_ORDER_ITEM",
          entity: "OrderItem",
          entityId: item.id,
          metadata: { orderId: parsed.orderId, quantity: parsed.quantity, reason: parsed.reason, refundAmount }
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

export async function updateInstallmentsAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  try {
    await requireRole(["ADMIN", "SALES", "FINANCE"]);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Acesso negado." };
  }

  const raw = Object.fromEntries(formData);
  const orderId = z.string().min(1).safeParse(raw.orderId);
  if (!orderId.success) return { error: "Pedido inválido." };

  const installmentsRaw = z.string().min(1).safeParse(raw.installments);
  if (!installmentsRaw.success) return { error: "Parcelas inválidas." };

  const newInstallments = z.array(z.object({
    dueDate: z.string().min(1),
    amount: z.coerce.number().min(0.01)
  })).min(1).safeParse(JSON.parse(installmentsRaw.data));
  if (!newInstallments.success) return { error: "Formato de parcelas inválido." };

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId.data },
        include: { installments: true }
      });

      if (order.paymentMethod !== "CREDIARIO") throw new Error("Pedido não é crediário.");
      if (order.status === "CANCELED") throw new Error("Pedido cancelado.");

      // remove unpaid installments + their pending financial entries
      const unpaid = order.installments.filter((i) => i.paidAt === null);
      const paidCount = order.installments.length - unpaid.length;

      if (unpaid.length > 0) {
        for (const inst of unpaid) {
          await tx.financialTransaction.deleteMany({
            where: {
              category: "Crediário",
              paidAt: null,
              OR: [
                { title: `Parcela ${inst.sequence}/${inst.totalCount} - ${order.code}` },
                { title: { startsWith: `Parcela ${inst.sequence}/`, endsWith: `- ${order.code}` } }
              ]
            }
          });
        }
        await tx.installment.deleteMany({ where: { id: { in: unpaid.map((i) => i.id) } } });
      }

      const items = newInstallments.data;
      const totalCount = paidCount + items.length;

      // recreate unpaid installments starting after paid ones
      for (let i = 0; i < items.length; i++) {
        const seq = paidCount + i + 1;
        const amount = Math.round(items[i].amount * 100) / 100;
        const dueDate = parseDateBRT(items[i].dueDate);

        await tx.installment.create({
          data: {
            orderId: orderId.data,
            sequence: seq,
            totalCount,
            dueDate,
            amount
          }
        });

        await tx.financialTransaction.create({
          data: {
            type: "REVENUE",
            title: `Parcela ${seq}/${totalCount} - ${order.code}`,
            category: "Crediário",
            amount,
            dueDate,
            paidAt: null
          }
        });
      }

      // update totalCount on already-paid installments if count changed
      if (paidCount > 0 && totalCount !== order.installments[0]?.totalCount) {
        await tx.installment.updateMany({
          where: { orderId: orderId.data, paidAt: { not: null } },
          data: { totalCount }
        });
      }
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao atualizar parcelas." };
  }

  revalidatePath("/vendas");
  revalidatePath("/credario");
  revalidatePath("/financeiro");
  revalidatePath("/clientes");
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

      const title = `Parcela ${inst.sequence}/${inst.totalCount} - ${inst.order.code}`;
      const existing = await tx.financialTransaction.findFirst({
        where: {
          category: "Crediário",
          paidAt: null,
          deletedAt: null,
          OR: [
            { title },
            { title: { startsWith: `Parcela ${inst.sequence}/`, endsWith: `- ${inst.order.code}` } }
          ]
        }
      });
      if (existing) {
        await tx.financialTransaction.update({
          where: { id: existing.id },
          data: { paidAt: now, paymentMethod: method, title }
        });
      } else {
        await tx.financialTransaction.create({
          data: { type: "REVENUE", title, category: "Crediário", amount: inst.amount, paymentMethod: method, paidAt: now }
        });
      }

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
  revalidatePath("/credario");
  revalidatePath("/");
}
