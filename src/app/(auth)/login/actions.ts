"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkSecurityRateLimit, clientIpFromHeaders, logSecurityEvent, normalizeIdentifier } from "@/lib/security";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export async function loginAction(_: unknown, formData: FormData) {
  const hdrs = await headers();
  const ip = clientIpFromHeaders(hdrs);
  const userAgent = hdrs.get("user-agent");
  const email = normalizeIdentifier(String(formData.get("email") ?? "")) ?? "";

  const limit = await checkSecurityRateLimit({
    scope: "app",
    action: "LOGIN",
    identifier: email,
    ip,
    windowSeconds: 10 * 60,
    maxAttempts: 8,
    blockSeconds: 10 * 60
  });

  if (!limit.allowed) {
    await logSecurityEvent({
      scope: "app",
      action: "LOGIN_BLOCKED",
      identifier: email,
      ip,
      userAgent,
      success: false,
      severity: "critical"
    });
    return { error: "Muitas tentativas. Aguarde 10 minutos e tente novamente." };
  }

  if (!process.env.DATABASE_URL) {
    return {
      error: "Banco de dados nao configurado. Crie o arquivo .env com DATABASE_URL do PostgreSQL e rode npm run db:push + npm run db:seed."
    };
  }

  const parsed = loginSchema.safeParse({
    email,
    password: formData.get("password")
  });

  if (!parsed.success) {
    await logSecurityEvent({ scope: "app", action: "LOGIN", identifier: email, ip, userAgent, success: false });
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
    await logSecurityEvent({ scope: "app", action: "LOGIN", identifier: parsed.data.email, ip, userAgent, success: false });
    return { error: "Credenciais invalidas." };
  }

  await createSession({ id: user.id, name: user.name, email: user.email, role: user.role });
  await Promise.all([
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN",
        entity: "User",
        entityId: user.id,
        metadata: { ip, userAgent }
      }
    }),
    logSecurityEvent({ scope: "app", action: "LOGIN", identifier: user.email, ip, userAgent, success: true })
  ]);
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
