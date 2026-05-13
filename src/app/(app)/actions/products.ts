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
}

export async function deleteProductAction(formData: FormData) {
  const user = await requireRole(["ADMIN"]);
  const { id } = z.object({ id: z.string().min(1) }).parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    await tx.product.delete({ where: { id } });
    await tx.auditLog.create({
      data: { userId: user.id, action: "DELETE_PRODUCT", entity: "Product", entityId: id }
    });
  });

  revalidatePath("/produtos");
}

export async function createVariantAction(formData: FormData) {
  const user = await requireRole(["ADMIN", "STOCK"]);
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

export async function updateVariantAction(formData: FormData) {
  await requireRole(["ADMIN", "STOCK"]);
  const parsed = z.object({
    id: z.string().min(1),
    sku: z.string().min(3),
    color: z.string().min(2),
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
}

export async function deleteVariantAction(formData: FormData) {
  const user = await requireRole(["ADMIN", "STOCK"]);
  const { id } = z.object({ id: z.string().min(1) }).parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    await tx.productVariant.delete({ where: { id } });
    await tx.auditLog.create({
      data: { userId: user.id, action: "DELETE_VARIANT", entity: "ProductVariant", entityId: id }
    });
  });

  revalidatePath("/produtos");
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
    const delta = parsed.type === "OUT" ? -parsed.quantity : parsed.quantity;
    const variant = await tx.productVariant.findUniqueOrThrow({
      where: { id: parsed.variantId },
      select: { stockQuantity: true }
    });

    if (delta < 0 && variant.stockQuantity < parsed.quantity) {
      throw new Error("Estoque insuficiente para esta movimentação.");
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
