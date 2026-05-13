"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hashPassword, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateStoreSettings } from "@/lib/settings";

export async function updateStoreSettingsAction(formData: FormData) {
  await requireRole(["ADMIN"]);
  const parsed = z.object({
    storeName: z.string().min(2).max(60),
    storeTagline: z.string().max(120).optional().or(z.literal("")),
    loginImageUrl: z.string().optional().or(z.literal(""))
  }).parse(Object.fromEntries(formData));

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

export async function toggleUserActiveAction(formData: FormData) {
  const actor = await requireRole(["ADMIN"]);
  const { id } = z.object({ id: z.string().min(1) }).parse(Object.fromEntries(formData));

  if (id === actor.id) throw new Error("Você não pode desativar sua própria conta.");

  const user = await prisma.user.findUniqueOrThrow({ where: { id }, select: { active: true } });
  await prisma.user.update({ where: { id }, data: { active: !user.active } });

  revalidatePath("/configuracoes");
}
