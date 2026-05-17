"use server";

import { AdminClientPlan, AdminClientStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { captureAllSnapshots, captureSnapshotForClient } from "@/lib/admin-snapshots";

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
  notes: z.string().trim().max(2000).optional(),
  contactName: z.string().trim().max(120).optional(),
  contactPhone: z.string().trim().max(40).optional(),
  contactEmail: z.string().trim().max(120).optional()
});

function nullableText(value?: string) {
  const text = value?.trim();
  return text ? text : null;
}

function digitsOnly(value?: string) {
  return value?.replace(/\D/g, "") || null;
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
    notes: formData.get("notes"),
    contactName: formData.get("contactName"),
    contactPhone: formData.get("contactPhone"),
    contactEmail: formData.get("contactEmail")
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
      notes: nullableText(data.notes),
      contactName: nullableText(data.contactName),
      contactPhone: digitsOnly(data.contactPhone),
      contactEmail: nullableText(data.contactEmail)
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
    notes: formData.get("notes"),
    contactName: formData.get("contactName"),
    contactPhone: formData.get("contactPhone"),
    contactEmail: formData.get("contactEmail")
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
      notes: nullableText(data.notes),
      contactName: nullableText(data.contactName),
      contactPhone: digitsOnly(data.contactPhone),
      contactEmail: nullableText(data.contactEmail)
    }
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/client/${data.key}`);
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

// ── Notes quick action ───────────────────────────────────────────────
export async function updateClientNotesAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  if (!id) throw new Error("Cliente invalido.");
  const client = await prisma.adminClient.update({
    where: { id },
    data: { notes: notes || null }
  });
  revalidatePath("/admin");
  revalidatePath(`/admin/client/${client.key}`);
}

// ── Tasks (CRM) ──────────────────────────────────────────────────────
const taskSchema = z.object({
  clientId: z.string().min(1),
  title: z.string().trim().min(1).max(280),
  dueDate: z.string().optional(),
  priority: z.coerce.number().int().min(0).max(3).optional()
});

export async function createTaskAction(formData: FormData) {
  const parsed = taskSchema.safeParse({
    clientId: formData.get("clientId"),
    title: formData.get("title"),
    dueDate: formData.get("dueDate") || undefined,
    priority: formData.get("priority") || undefined
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Tarefa invalida.");
  const client = await prisma.adminClient.findUnique({
    where: { id: parsed.data.clientId },
    select: { key: true }
  });
  if (!client) throw new Error("Cliente nao encontrado.");
  await prisma.adminTask.create({
    data: {
      clientId: parsed.data.clientId,
      title: parsed.data.title,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      priority: parsed.data.priority ?? 0
    }
  });
  revalidatePath("/admin");
  revalidatePath(`/admin/client/${client.key}`);
}

export async function toggleTaskAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Tarefa invalida.");
  const existing = await prisma.adminTask.findUnique({
    where: { id },
    include: { client: { select: { key: true } } }
  });
  if (!existing) throw new Error("Tarefa nao encontrada.");
  await prisma.adminTask.update({
    where: { id },
    data: { done: !existing.done }
  });
  revalidatePath("/admin");
  revalidatePath(`/admin/client/${existing.client.key}`);
}

export async function deleteTaskAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Tarefa invalida.");
  const existing = await prisma.adminTask.findUnique({
    where: { id },
    include: { client: { select: { key: true } } }
  });
  if (!existing) return;
  await prisma.adminTask.delete({ where: { id } });
  revalidatePath("/admin");
  revalidatePath(`/admin/client/${existing.client.key}`);
}

// ── Snapshots ────────────────────────────────────────────────────────
export async function captureAllSnapshotsAction() {
  await captureAllSnapshots();
  revalidatePath("/admin");
}

export async function captureClientSnapshotAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Cliente invalido.");
  const client = await prisma.adminClient.findUnique({ where: { id } });
  if (!client) throw new Error("Cliente nao encontrado.");
  await captureSnapshotForClient(client);
  revalidatePath("/admin");
  revalidatePath(`/admin/client/${client.key}`);
}
