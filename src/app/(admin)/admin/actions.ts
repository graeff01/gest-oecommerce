"use server";

import { AdminClientPlan, AdminClientStatus, Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/admin-crypto";
import { ADMIN_COOKIE, getAdminSessionFromToken } from "@/lib/admin-auth";
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

async function auditAdminAction(action: string, entity: string, entityId?: string | null, metadata?: Prisma.InputJsonValue) {
  const cookieStore = await cookies();
  const session = getAdminSessionFromToken(cookieStore.get(ADMIN_COOKIE)?.value);
  await prisma.auditLog.create({
    data: {
      userId: session?.legacy ? null : session?.id ?? null,
      action,
      entity,
      entityId: entityId ?? null,
      metadata: metadata ?? undefined
    }
  }).catch(() => null);
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
  const client = await prisma.adminClient.create({
    data: {
      key: data.key,
      name: data.name,
      storeName: nullableText(data.storeName),
      appUrl: nullableText(data.appUrl),
      databaseUrl: encryptSecret(data.databaseUrl),
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

  await auditAdminAction("ADMIN_CLIENT_CREATED", "AdminClient", client.id, {
    key: client.key,
    status: client.status,
    plan: client.plan
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
  const before = await prisma.adminClient.findUnique({
    where: { id },
    select: { key: true, status: true, plan: true, monthlyFee: true, renewalDay: true }
  });

  const client = await prisma.adminClient.update({
    where: { id },
    data: {
      key: data.key,
      name: data.name,
      storeName: nullableText(data.storeName),
      appUrl: nullableText(data.appUrl),
      databaseUrl: encryptSecret(data.databaseUrl),
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

  await auditAdminAction("ADMIN_CLIENT_UPDATED", "AdminClient", client.id, {
    before: before
      ? {
          key: before.key,
          status: before.status,
          plan: before.plan,
          monthlyFee: before.monthlyFee === null ? null : Number(before.monthlyFee),
          renewalDay: before.renewalDay
        }
      : null,
    after: {
      key: client.key,
      status: client.status,
      plan: client.plan,
      monthlyFee: client.monthlyFee === null ? null : Number(client.monthlyFee),
      renewalDay: client.renewalDay
    },
    databaseUrlChanged: true
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

  const client = await prisma.adminClient.update({
    where: { id },
    data: { status: status as AdminClientStatus }
  });

  await auditAdminAction("ADMIN_CLIENT_STATUS_CHANGED", "AdminClient", client.id, {
    key: client.key,
    status: client.status
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/client/${client.key}`);
}

export async function deleteAdminClientAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const confirmation = String(formData.get("confirmKey") ?? "");
  if (!id) throw new Error("Cliente invalido.");
  const target = await prisma.adminClient.findUnique({
    where: { id },
    select: { key: true }
  });
  if (!target) throw new Error("Cliente nao encontrado.");
  if (confirmation !== target.key) {
    throw new Error(`Digite ${target.key} para confirmar a remocao.`);
  }

  const client = await prisma.adminClient.delete({ where: { id } });
  await auditAdminAction("ADMIN_CLIENT_DELETED", "AdminClient", client.id, {
    key: client.key,
    name: client.name
  });
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
  await auditAdminAction("ADMIN_CLIENT_NOTES_UPDATED", "AdminClient", client.id, { key: client.key });
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
  await auditAdminAction("ADMIN_TASK_CREATED", "AdminClient", parsed.data.clientId, {
    key: client.key,
    priority: parsed.data.priority ?? 0
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
  await auditAdminAction("ADMIN_TASK_TOGGLED", "AdminTask", existing.id, {
    clientKey: existing.client.key,
    done: !existing.done
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
  await auditAdminAction("ADMIN_TASK_DELETED", "AdminTask", existing.id, {
    clientKey: existing.client.key
  });
  revalidatePath("/admin");
  revalidatePath(`/admin/client/${existing.client.key}`);
}

// ── Snapshots ────────────────────────────────────────────────────────
export async function toggleOnboardingItemAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Item invalido.");
  const existing = await prisma.adminOnboardingItem.findUnique({
    where: { id },
    include: { client: { select: { key: true } } }
  });
  if (!existing) throw new Error("Item nao encontrado.");

  await prisma.adminOnboardingItem.update({
    where: { id },
    data: {
      done: !existing.done,
      doneAt: existing.done ? null : new Date()
    }
  });

  await auditAdminAction("ADMIN_ONBOARDING_TOGGLED", "AdminOnboardingItem", existing.id, {
    clientKey: existing.client.key,
    key: existing.key,
    done: !existing.done
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/client/${existing.client.key}`);
}

export async function captureAllSnapshotsAction() {
  await captureAllSnapshots();
  await auditAdminAction("ADMIN_SNAPSHOTS_CAPTURED", "AdminClientSnapshot");
  revalidatePath("/admin");
}

export async function captureClientSnapshotAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Cliente invalido.");
  const client = await prisma.adminClient.findUnique({ where: { id } });
  if (!client) throw new Error("Cliente nao encontrado.");
  await captureSnapshotForClient(client);
  await auditAdminAction("ADMIN_CLIENT_SNAPSHOT_CAPTURED", "AdminClient", client.id, { key: client.key });
  revalidatePath("/admin");
  revalidatePath(`/admin/client/${client.key}`);
}
