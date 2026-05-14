"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function setupAction(_: unknown, formData: FormData) {
  // Garante que só funciona se não existir nenhum usuário ainda
  const count = await prisma.user.count();
  if (count > 0) {
    return { error: "O sistema já foi configurado. Use a tela de login." };
  }

  const parsed = z.object({
    storeName: z.string().min(2, "Informe o nome da loja."),
    name: z.string().min(2, "Informe seu nome completo."),
    email: z.string().email("Informe um e-mail válido."),
    password: z.string().min(8, "A senha precisa ter no mínimo 8 caracteres."),
    confirmPassword: z.string()
  }).safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { storeName, name, email, password, confirmPassword } = parsed.data;

  if (password !== confirmPassword) {
    return { error: "As senhas não coincidem." };
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email, passwordHash, role: "ADMIN", active: true }
    });

    await tx.storeSettings.upsert({
      where: { id: 1 },
      update: { storeName },
      create: { id: 1, storeName, cashBalance: 0 }
    });

    await tx.auditLog.create({
      data: { userId: user.id, action: "SETUP", entity: "User", entityId: user.id }
    });
  });

  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  await createSession({ id: user.id, name: user.name, email: user.email, role: user.role });

  redirect("/");
}
