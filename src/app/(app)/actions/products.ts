"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const decimal = z.coerce.number().min(0);

function parseTags(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  return value.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 12);
}

export async function createProductAction(formData: FormData) {
  const user = await requireRole(["ADMIN", "STOCK"]);
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
  revalidatePath("/vendas");
  revalidatePath("/compras");
}

export async function updateProductAction(formData: FormData) {
  const user = await requireRole(["ADMIN", "STOCK"]);
  const parsed = z.object({
    id: z.string().min(1),
    name: z.string().min(2),
    category: z.string().min(2),
    brand: z.string().optional(),
    gender: z.string().optional(),
    imageUrl: z.string().url().optional().or(z.literal("")),
    tags: z.array(z.string()).default([])
  }).parse({ ...Object.fromEntries(formData), tags: parseTags(formData.get("tags")) });

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: parsed.id },
      data: {
        name: parsed.name,
        category: parsed.category,
        brand: parsed.brand || null,
        gender: parsed.gender || null,
        imageUrl: parsed.imageUrl || null,
        tags: parsed.tags
      }
    });
    await tx.auditLog.create({
      data: { userId: user.id, action: "UPDATE_PRODUCT", entity: "Product", entityId: parsed.id }
    });
  });

  revalidatePath("/produtos");
  revalidatePath("/vendas");
  revalidatePath("/compras");
}

export async function deleteProductAction(formData: FormData) {
  const user = await requireRole(["ADMIN"]);
  const { id } = z.object({ id: z.string().min(1) }).parse(Object.fromEntries(formData));

  // Bloqueia exclusão se há itens de pedido vinculados (onDelete: Restrict no OrderItem)
  const hasOrders = await prisma.orderItem.count({
    where: { variant: { productId: id } }
  });
  if (hasOrders > 0) {
    throw new Error("Não é possível excluir um produto que já teve pedidos. Inative-o em vez de excluir.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.delete({ where: { id } });
    await tx.auditLog.create({
      data: { userId: user.id, action: "DELETE_PRODUCT", entity: "Product", entityId: id }
    });
  });

  revalidatePath("/produtos");
  revalidatePath("/vendas");
  revalidatePath("/compras");
}

export async function createVariantAction(formData: FormData) {
  const user = await requireRole(["ADMIN", "STOCK"]);
  const parsed = z.object({
    productId: z.string().min(1),
    sku: z.string().min(1),
    color: z.string().min(1),
    size: z.string().min(1),
    costPrice: decimal,
    salePrice: decimal,
    stockQuantity: z.coerce.number().int().min(0),
    minStock: z.coerce.number().int().min(0)
  }).parse(Object.fromEntries(formData));

  const variant = await prisma.productVariant.create({ data: parsed });

  if (parsed.stockQuantity > 0) {
    await prisma.stockMovement.create({
      data: { variantId: variant.id, userId: user.id, type: "IN", quantity: parsed.stockQuantity, reason: "Estoque inicial" }
    });
  }

  revalidatePath("/produtos");
  revalidatePath("/vendas");
  revalidatePath("/compras");
}

export async function updateVariantAction(formData: FormData) {
  await requireRole(["ADMIN", "STOCK"]);
  const parsed = z.object({
    id: z.string().min(1),
    sku: z.string().min(1),
    color: z.string().min(1),
    size: z.string().min(1),
    costPrice: decimal,
    salePrice: decimal,
    minStock: z.coerce.number().int().min(0)
  }).parse(Object.fromEntries(formData));

  await prisma.productVariant.update({
    where: { id: parsed.id },
    data: {
      sku: parsed.sku,
      color: parsed.color,
      size: parsed.size,
      costPrice: parsed.costPrice,
      salePrice: parsed.salePrice,
      minStock: parsed.minStock
    }
  });

  revalidatePath("/produtos");
  revalidatePath("/vendas");
}

export async function deleteVariantAction(formData: FormData) {
  const user = await requireRole(["ADMIN", "STOCK"]);
  const { id } = z.object({ id: z.string().min(1) }).parse(Object.fromEntries(formData));

  // Bloqueia se há itens de pedido (onDelete: Restrict)
  const hasOrders = await prisma.orderItem.count({ where: { variantId: id } });
  if (hasOrders > 0) {
    throw new Error("Não é possível excluir uma variação que já teve pedidos registrados.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.productVariant.delete({ where: { id } });
    await tx.auditLog.create({
      data: { userId: user.id, action: "DELETE_VARIANT", entity: "ProductVariant", entityId: id }
    });
  });

  revalidatePath("/produtos");
  revalidatePath("/vendas");
  revalidatePath("/compras");
}

export async function adjustStockAction(formData: FormData) {
  const user = await requireRole(["ADMIN", "STOCK"]);
  const parsed = z.object({
    variantId: z.string().min(1),
    type: z.enum(["IN", "OUT", "ADJUSTMENT", "RETURN"]),
    quantity: z.coerce.number().int().min(1),
    reason: z.string().min(3)
  }).parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    const variant = await tx.productVariant.findUniqueOrThrow({
      where: { id: parsed.variantId },
      select: { stockQuantity: true, costPrice: true, sku: true }
    });

    let newQuantity: number;
    let lostQty = 0; // quantidade que saiu sem ser venda/retorno

    if (parsed.type === "ADJUSTMENT") {
      newQuantity = parsed.quantity;
      // se ajuste reduziu o estoque, registra a perda no financeiro
      lostQty = Math.max(0, variant.stockQuantity - parsed.quantity);
    } else if (parsed.type === "OUT") {
      if (variant.stockQuantity < parsed.quantity) {
        throw new Error("Estoque insuficiente para esta movimentação.");
      }
      newQuantity = variant.stockQuantity - parsed.quantity;
      lostQty = parsed.quantity;
    } else {
      // IN ou RETURN: soma, sem impacto financeiro de perda
      newQuantity = variant.stockQuantity + parsed.quantity;
    }

    await tx.productVariant.update({
      where: { id: parsed.variantId },
      data: { stockQuantity: newQuantity }
    });

    await tx.stockMovement.create({
      data: {
        variantId: parsed.variantId,
        userId: user.id,
        type: parsed.type,
        quantity: parsed.quantity,
        reason: parsed.reason
      }
    });

    // saída ou ajuste para baixo: registra despesa de perda/baixa de estoque
    if (lostQty > 0) {
      const lossAmount = Math.round(Number(variant.costPrice) * lostQty * 100) / 100;
      if (lossAmount > 0) {
        await tx.financialTransaction.create({
          data: {
            type: "EXPENSE",
            title: `Baixa de estoque - ${variant.sku}`,
            category: "Perda de estoque",
            amount: lossAmount,
            paidAt: new Date(),
            notes: parsed.reason
          }
        });
      }
    }
  });

  revalidatePath("/produtos");
  revalidatePath("/movimentacoes");
  revalidatePath("/financeiro");
  revalidatePath("/vendas");
  revalidatePath("/");
}
