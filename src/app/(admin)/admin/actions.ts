"use server";

import { AdminClientPlan, AdminClientStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const clientSchema = z.object({
  key: z.string().trim().min(2).max(48).regex(/^[a-z0-9-]+$/, "Use apenas letras minusculas, numeros e hifen."),
  name: z.string().trim().min(2).max(120),
  storeName: z.string().trim().max(120).optional(),
  appUrl: z.string().trim().url().optional().or(z.literal("")),
  databaseUrl: z.string().trim().min(12),
  status: z.nativeEnum(AdminClientStatus),
  plan: z.nativeEnum(AdminClientPlan),
  monthlyFee: z.coerce.number().min(0).max(999999).optional(),
  renewalDay: z.coerce.number().int().min(1).max(31).optional(),
  notes: z.string().trim().max(1000).optional()
});

function nullableText(value?: string) {
  const text = value?.trim();
  return text ? text : null;
}

export async function createAdminClientAction(formData: FormData) {
  const parsed = clientSchema.safeParse({
    key: formData.get("key"),
    name: formData.get("name"),
    storeName: formData.get("storeName"),
    appUrl: formData.get("appUrl"),
    databaseUrl: formData.get("databaseUrl"),
    status: formData.get("status"),
    plan: formData.get("plan"),
    monthlyFee: formData.get("monthlyFee") || undefined,
    renewalDay: formData.get("renewalDay") || undefined,
    notes: formData.get("notes")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados invalidos.");
  }

  const data = parsed.data;
  await prisma.adminClient.create({
    data: {
      key: data.key,
      name: data.name,
      storeName: nullableText(data.storeName),
      appUrl: nullableText(data.appUrl),
      databaseUrl: data.databaseUrl,
      status: data.status,
      plan: data.plan,
      monthlyFee: data.monthlyFee ?? null,
      renewalDay: data.renewalDay ?? null,
      notes: nullableText(data.notes)
    }
  });

  revalidatePath("/admin");
}

export async function updateAdminClientAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const parsed = clientSchema.safeParse({
    key: formData.get("key"),
    name: formData.get("name"),
    storeName: formData.get("storeName"),
    appUrl: formData.get("appUrl"),
    databaseUrl: formData.get("databaseUrl"),
    status: formData.get("status"),
    plan: formData.get("plan"),
    monthlyFee: formData.get("monthlyFee") || undefined,
    renewalDay: formData.get("renewalDay") || undefined,
    notes: formData.get("notes")
  });

  if (!id || !parsed.success) {
    throw new Error(parsed.success ? "Cliente invalido." : parsed.error.issues[0]?.message ?? "Dados invalidos.");
  }

  const data = parsed.data;
  await prisma.adminClient.update({
    where: { id },
    data: {
      key: data.key,
      name: data.name,
      storeName: nullableText(data.storeName),
      appUrl: nullableText(data.appUrl),
      databaseUrl: data.databaseUrl,
      status: data.status,
      plan: data.plan,
      monthlyFee: data.monthlyFee ?? null,
      renewalDay: data.renewalDay ?? null,
      notes: nullableText(data.notes)
    }
  });

  revalidatePath("/admin");
}

export async function setAdminClientStatusAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = formData.get("status");

  if (!id || !Object.values(AdminClientStatus).includes(status as AdminClientStatus)) {
    throw new Error("Status invalido.");
  }

  await prisma.adminClient.update({
    where: { id },
    data: { status: status as AdminClientStatus }
  });

  revalidatePath("/admin");
}

export async function deleteAdminClientAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Cliente invalido.");

  await prisma.adminClient.delete({ where: { id } });
  revalidatePath("/admin");
}
