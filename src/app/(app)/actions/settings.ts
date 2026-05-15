"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, hashPassword, requireRole, requireUser, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateStoreSettings } from "@/lib/settings";

export async function updateStoreSettingsAction(formData: FormData) {
  await requireRole(["ADMIN"]);
  const parsed = z.object({
    storeName: z.string().min(2).max(60),
    storeTagline: z.string().max(120).optional().or(z.literal("")),
    loginImageUrl: z.string().optional().or(z.literal("")),
    cashBalance: z.coerce.number().min(0).default(0)
  }).parse(Object.fromEntries(formData));

  await updateStoreSettings({
    storeName: parsed.storeName.trim(),
    storeTagline: parsed.storeTagline?.trim() || null,
    loginImageUrl: parsed.loginImageUrl?.trim() || null,
    cashBalance: parsed.cashBalance
  });

  revalidatePath("/", "layout");
  revalidatePath("/login");
  revalidatePath("/configuracoes");
}

export async function createUserAction(formData: FormData) {
  await requireRole(["ADMIN"]);
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

export async function saveFinanceCategoriesAction(formData: FormData) {
  await requireRole(["ADMIN"]);
  const raw = formData.get("categories");
  const categories = z.string().parse(raw)
    .split("\n")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  await prisma.storeSettings.upsert({
    where: { id: 1 },
    update: { financeCategories: categories },
    create: { id: 1, storeName: "Minha Loja", cashBalance: 0, financeCategories: categories }
  });

  revalidatePath("/configuracoes");
  revalidatePath("/financeiro");
}

export async function updateProfileAction(_: unknown, formData: FormData) {
  const actor = await requireUser();

  const parsed = z.object({
    name: z.string().min(2, "Informe seu nome completo."),
    email: z.string().email("Informe um e-mail válido."),
    currentPassword: z.string().min(1, "Informe a senha atual."),
    newPassword: z.string().optional().or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal(""))
  }).safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { name, email, currentPassword, newPassword, confirmPassword } = parsed.data;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: actor.id } });
  const passwordOk = await verifyPassword(currentPassword, user.passwordHash);
  if (!passwordOk) {
    return { error: "Senha atual incorreta." };
  }

  if (email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== actor.id) {
      return { error: "Este e-mail já está em uso por outro usuário." };
    }
  }

  const updateData: Record<string, unknown> = { name: name.trim(), email: email.trim().toLowerCase() };

  if (newPassword) {
    if (newPassword.length < 8) {
      return { error: "A nova senha precisa ter no mínimo 8 caracteres." };
    }
    if (newPassword !== confirmPassword) {
      return { error: "As novas senhas não coincidem." };
    }
    updateData.passwordHash = await hashPassword(newPassword);
  }

  await prisma.user.update({ where: { id: actor.id }, data: updateData });

  // Refresh session token with updated name/email
  await createSession({ id: actor.id, name: name.trim(), email: email.trim().toLowerCase(), role: actor.role });

  revalidatePath("/configuracoes");
  return { success: true };
}

export async function toggleUserActiveAction(formData: FormData) {
  const actor = await requireRole(["ADMIN"]);
  const { id } = z.object({ id: z.string().min(1) }).parse(Object.fromEntries(formData));

  if (id === actor.id) throw new Error("Você não pode desativar sua própria conta.");

  const user = await prisma.user.findUniqueOrThrow({ where: { id }, select: { active: true } });
  await prisma.user.update({ where: { id }, data: { active: !user.active } });

  revalidatePath("/configuracoes");
}
