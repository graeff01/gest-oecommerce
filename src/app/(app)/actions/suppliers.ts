"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function createSupplierAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  try {
    await requireRole(["ADMIN", "STOCK"]);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Acesso negado." };
  }
  const result = z.object({
    name: z.string().min(2, "Nome precisa ter ao menos 2 caracteres."),
    document: z.string().optional(),
    contact: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    notes: z.string().optional()
  }).safeParse(Object.fromEntries(formData));

  if (!result.success) return { error: result.error.errors[0].message };

  try {
    await prisma.supplier.create({ data: { ...result.data, email: result.data.email || null } });
  } catch {
    return { error: "Erro ao cadastrar fornecedor. Tente novamente." };
  }
  revalidatePath("/fornecedores");
  return { success: true };
}

export async function updateSupplierAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  try {
    await requireRole(["ADMIN", "STOCK"]);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Acesso negado." };
  }
  const result = z.object({
    id: z.string().min(1),
    name: z.string().min(2, "Nome precisa ter ao menos 2 caracteres."),
    document: z.string().optional(),
    contact: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    notes: z.string().optional()
  }).safeParse(Object.fromEntries(formData));

  if (!result.success) return { error: result.error.errors[0].message };
  const { id, ...data } = result.data;

  try {
    await prisma.supplier.update({
      where: { id },
      data: {
        name: data.name,
        document: data.document || null,
        contact: data.contact || null,
        phone: data.phone || null,
        email: data.email || null,
        notes: data.notes || null
      }
    });
  } catch {
    return { error: "Erro ao salvar fornecedor. Tente novamente." };
  }
  revalidatePath("/fornecedores");
  return { success: true };
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
