"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function createSupplierAction(formData: FormData) {
  await requireRole(["ADMIN", "STOCK"]);
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

export async function updateSupplierAction(formData: FormData) {
  await requireRole(["ADMIN", "STOCK"]);
  const parsed = z.object({
    id: z.string().min(1),
    name: z.string().min(2),
    document: z.string().optional(),
    contact: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    notes: z.string().optional()
  }).parse(Object.fromEntries(formData));

  await prisma.supplier.update({
    where: { id: parsed.id },
    data: {
      name: parsed.name,
      document: parsed.document || null,
      contact: parsed.contact || null,
      phone: parsed.phone || null,
      email: parsed.email || null,
      notes: parsed.notes || null
    }
  });
  revalidatePath("/fornecedores");
}

export async function deleteSupplierAction(formData: FormData) {
  const user = await requireRole(["ADMIN"]);
  const { id } = z.object({ id: z.string().min(1) }).parse(Object.fromEntries(formData));

  const hasPurchases = await prisma.purchase.count({ where: { supplierId: id } });
  if (hasPurchases > 0) {
    throw new Error("Não é possível excluir um fornecedor com compras registradas.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.supplier.delete({ where: { id } });
    await tx.auditLog.create({
      data: { userId: user.id, action: "DELETE_SUPPLIER", entity: "Supplier", entityId: id }
    });
  });

  revalidatePath("/fornecedores");
}
