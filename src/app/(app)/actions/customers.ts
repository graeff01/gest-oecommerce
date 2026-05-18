"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function createCustomerAction(formData: FormData) {
  await requireRole(["ADMIN", "SALES", "FINANCE"]);
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

export async function updateCustomerAction(formData: FormData) {
  await requireRole(["ADMIN", "SALES", "FINANCE"]);
  const parsed = z.object({
    id: z.string().min(1),
    name: z.string().min(2),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    document: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional()
  }).parse(Object.fromEntries(formData));

  await prisma.customer.update({
    where: { id: parsed.id },
    data: {
      name: parsed.name,
      email: parsed.email || null,
      phone: parsed.phone || null,
      document: parsed.document || null,
      address: parsed.address || null,
      notes: parsed.notes || null
    }
  });
  revalidatePath("/clientes");
}

export async function deleteCustomerAction(formData: FormData) {
  const user = await requireRole(["ADMIN"]);
  const { id } = z.object({ id: z.string().min(1) }).parse(Object.fromEntries(formData));

  const hasOrders = await prisma.order.count({ where: { customerId: id } });
  if (hasOrders > 0) {
    throw new Error("Não é possível excluir um cliente com pedidos registrados.");
  }

  // Verifica parcelas em aberto via join (caso existam de pedidos já desvinculados)
  const openInstallments = await prisma.installment.count({
    where: { paidAt: null, order: { customerId: id } }
  });
  if (openInstallments > 0) {
    throw new Error(`Não é possível excluir este cliente: há ${openInstallments} parcela(s) de crediário em aberto.`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.customer.delete({ where: { id } });
    await tx.auditLog.create({
      data: { userId: user.id, action: "DELETE_CUSTOMER", entity: "Customer", entityId: id }
    });
  });

  revalidatePath("/clientes");
}
