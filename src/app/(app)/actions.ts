"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { hashPassword, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateStoreSettings } from "@/lib/settings";

const decimal = z.coerce.number().min(0);

function parseTags(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export async function createProductAction(formData: FormData) {
  const user = await requireUser();
  const parsed = z.object({
    name: z.string().min(2),
    category: z.string().min(2),
    brand: z.string().optional(),
    gender: z.string().optional(),
    imageUrl: z.string().url().optional().or(z.literal("")),
    tags: z.array(z.string()).default([])
  }).parse({ ...Object.fromEntries(formData), tags: parseTags(formData.get("tags")) });

  await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name: parsed.name,
        category: parsed.category,
        brand: parsed.brand,
        gender: parsed.gender,
        imageUrl: parsed.imageUrl || null,
        tags: parsed.tags
      }
    });

    await tx.auditLog.create({
      data: { userId: user.id, action: "CREATE_PRODUCT", entity: "Product", entityId: product.id }
    });
  });

  revalidatePath("/produtos");
}

export async function createVariantAction(formData: FormData) {
  const user = await requireUser();
  const parsed = z.object({
    productId: z.string().min(1),
    sku: z.string().min(3),
    color: z.string().min(2),
    size: z.string().min(1),
    costPrice: decimal,
    salePrice: decimal,
    stockQuantity: z.coerce.number().int().min(0),
    minStock: z.coerce.number().int().min(0)
  }).parse(Object.fromEntries(formData));

  const variant = await prisma.productVariant.create({ data: parsed });
  await prisma.stockMovement.create({
    data: { variantId: variant.id, userId: user.id, type: "IN", quantity: parsed.stockQuantity, reason: "Nova variação" }
  });

  revalidatePath("/produtos");
}

export async function adjustStockAction(formData: FormData) {
  const user = await requireUser();
  const parsed = z.object({
    variantId: z.string().min(1),
    type: z.enum(["IN", "OUT", "ADJUSTMENT", "RETURN"]),
    quantity: z.coerce.number().int().min(1),
    reason: z.string().min(3)
  }).parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    const delta = parsed.type === "OUT" ? -parsed.quantity : parsed.quantity;
    const variant = await tx.productVariant.findUniqueOrThrow({
      where: { id: parsed.variantId },
      select: { stockQuantity: true }
    });

    if (delta < 0 && variant.stockQuantity < parsed.quantity) {
      throw new Error("Estoque insuficiente para esta movimentacao.");
    }

    await tx.productVariant.update({
      where: { id: parsed.variantId },
      data: { stockQuantity: { increment: delta } }
    });
    await tx.stockMovement.create({
      data: { ...parsed, userId: user.id }
    });
  });

  revalidatePath("/produtos");
}

export async function createCustomerAction(formData: FormData) {
  await requireUser();
  const parsed = z.object({
    name: z.string().min(2),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    document: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional()
  }).parse(Object.fromEntries(formData));

  await prisma.customer.create({ data: { ...parsed, email: parsed.email || null } });
  revalidatePath("/clientes");
}

export async function createSupplierAction(formData: FormData) {
  await requireUser();
  const parsed = z.object({
    name: z.string().min(2),
    document: z.string().optional(),
    contact: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    notes: z.string().optional()
  }).parse(Object.fromEntries(formData));

  await prisma.supplier.create({ data: { ...parsed, email: parsed.email || null } });
  revalidatePath("/fornecedores");
}

export async function createFinancialTransactionAction(formData: FormData) {
  await requireUser();
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

export async function createOrderAction(formData: FormData) {
  const user = await requireUser();
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
    if (!parsed.customerId) {
      throw new Error("Crediario exige selecionar um cliente.");
    }
    if (!parsed.installmentCount || parsed.installmentCount < 1) {
      throw new Error("Informe a quantidade de parcelas para o crediario.");
    }
  }

  await prisma.$transaction(async (tx) => {
    const variant = await tx.productVariant.findUniqueOrThrow({
      where: { id: parsed.variantId },
      include: { product: true }
    });

    if (variant.stockQuantity < parsed.quantity) {
      throw new Error("Estoque insuficiente para esta venda.");
    }

    const subtotal = Number(variant.salePrice) * parsed.quantity;
    const total = subtotal - parsed.discount + parsed.fee;

    if (total < 0) {
      throw new Error("O desconto nao pode deixar o total da venda negativo.");
    }

    const code = `PED-${randomUUID().slice(0, 8).toUpperCase()}`;

    const stockUpdate = await tx.productVariant.updateMany({
      where: { id: variant.id, stockQuantity: { gte: parsed.quantity } },
      data: { stockQuantity: { decrement: parsed.quantity } }
    });

    if (stockUpdate.count !== 1) {
      throw new Error("Estoque insuficiente para esta venda.");
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
        const amountCents = baseCents + (i === count - 1 ? remainder : 0);
        return {
          orderId: order.id,
          sequence: i + 1,
          totalCount: count,
          dueDate: due,
          amount: amountCents / 100
        };
      });

      await tx.installment.createMany({ data: installments });
    } else {
      await tx.financialTransaction.create({
        data: { type: "REVENUE", title: `Venda ${code}`, category: "Vendas", amount: total, paymentMethod: parsed.paymentMethod, paidAt: new Date() }
      });
    }

    await tx.auditLog.create({ data: { userId: user.id, action: "CREATE_ORDER", entity: "Order", entityId: order.id } });
  });

  revalidatePath("/vendas");
  revalidatePath("/financeiro");
  revalidatePath("/clientes");
  revalidatePath("/");
}

export async function payInstallmentAction(formData: FormData) {
  const user = await requireUser();
  const parsed = z.object({
    installmentId: z.string().min(1),
    paymentMethod: z.enum(["PIX", "CREDIT_CARD", "DEBIT_CARD", "CASH", "BANK_SLIP", "MARKETPLACE"]).optional().or(z.literal(""))
  }).parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    const installment = await tx.installment.findUniqueOrThrow({
      where: { id: parsed.installmentId },
      include: { order: { include: { installments: true } } }
    });

    if (installment.paidAt) {
      throw new Error("Esta parcela ja foi paga.");
    }

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
        category: "Crediario",
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

export async function createPurchaseAction(formData: FormData) {
  const user = await requireUser();
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
      data: {
        stockQuantity: { increment: parsed.quantity },
        costPrice: parsed.unitCost
      }
    });
    await tx.stockMovement.create({
      data: { variantId: parsed.variantId, userId: user.id, type: "IN", quantity: parsed.quantity, reason: `Compra ${code}` }
    });
    await tx.financialTransaction.create({
      data: { type: "EXPENSE", title: `Compra ${code}`, category: "Mercadorias", amount: total, paidAt: new Date() }
    });
    await tx.auditLog.create({ data: { userId: user.id, action: "CREATE_PURCHASE", entity: "Purchase", entityId: purchase.id } });
  });

  revalidatePath("/compras");
  revalidatePath("/financeiro");
  revalidatePath("/");
}

export async function updateStoreSettingsAction(formData: FormData) {
  await requireUser();
  const parsed = z
    .object({
      storeName: z.string().min(2).max(60),
      storeTagline: z.string().max(120).optional().or(z.literal("")),
      loginImageUrl: z.string().optional().or(z.literal(""))
    })
    .parse(Object.fromEntries(formData));

  await updateStoreSettings({
    storeName: parsed.storeName.trim(),
    storeTagline: parsed.storeTagline?.trim() || null,
    loginImageUrl: parsed.loginImageUrl?.trim() || null
  });

  revalidatePath("/", "layout");
  revalidatePath("/login");
  revalidatePath("/configuracoes");
}

export async function createUserAction(formData: FormData) {
  await requireUser();
  const parsed = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(["ADMIN", "FINANCE", "STOCK", "SALES"])
  }).parse(Object.fromEntries(formData));

  await prisma.user.create({
    data: {
      name: parsed.name,
      email: parsed.email,
      passwordHash: await hashPassword(parsed.password),
      role: parsed.role
    }
  });
  revalidatePath("/configuracoes");
  redirect("/configuracoes");
}
