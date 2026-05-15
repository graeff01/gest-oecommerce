"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 10;

// In-memory store: ip -> { count, resetAt }
const attempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) return false;
  return true;
}

function resetRateLimit(ip: string) {
  attempts.delete(ip);
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export async function loginAction(_: unknown, formData: FormData) {
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0].trim() ?? hdrs.get("x-real-ip") ?? "unknown";

  if (!checkRateLimit(ip)) {
    return { error: "Muitas tentativas. Aguarde 5 minutos e tente novamente." };
  }

  if (!process.env.DATABASE_URL) {
    return {
      error: "Banco de dados nao configurado. Crie o arquivo .env com DATABASE_URL do PostgreSQL e rode npm run db:push + npm run db:seed."
    };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return { error: "Informe e-mail e senha validos." };
  }

  let user;

  try {
    user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  } catch {
    return {
      error: "Nao foi possivel conectar ao banco. Verifique DATABASE_URL, rode npm run db:push e depois npm run db:seed."
    };
  }

  if (!user?.active || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Credenciais invalidas." };
  }

  resetRateLimit(ip);
  await createSession({ id: user.id, name: user.name, email: user.email, role: user.role });
  await prisma.auditLog.create({ data: { userId: user.id, action: "LOGIN", entity: "User", entityId: user.id } });
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
