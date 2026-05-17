import "server-only";

import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

export const ADMIN_COOKIE = "gestao_admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export type AdminSession = {
  id: string;
  email: string;
  name: string;
  role: string;
  legacy?: boolean;
};

function getAdminSecret() {
  return process.env.ADMIN_SECRET ?? "";
}

export function allowsLegacyAdminSecret() {
  return process.env.DISABLE_ADMIN_SECRET_FALLBACK !== "1";
}

function getSigningSecret() {
  return process.env.AUTH_SECRET || process.env.ADMIN_SECRET || "dev-admin-session-secret";
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function encodeJson(value: unknown) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeJson<T>(value: string): T | null {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getSigningSecret()).update(payload).digest("base64url");
}

export function verifyAdminPassword(secret: string) {
  const expected = getAdminSecret();
  if (!expected || !secret) return false;
  return safeEqual(secret, expected);
}

export async function ensureEnvMasterAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 8) return null;

  const existing = await prisma.masterAdminUser.findUnique({ where: { email } }).catch(() => null);
  if (existing) return existing;

  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.masterAdminUser.create({
    data: {
      email,
      passwordHash,
      name: process.env.ADMIN_NAME?.trim() || "Administrador Master",
      role: "OWNER"
    }
  }).catch(() => null);
}

export async function verifyMasterAdminCredentials(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) return null;

  await ensureEnvMasterAdmin();

  const user = await prisma.masterAdminUser.findUnique({ where: { email: normalizedEmail } }).catch(() => null);
  if (!user?.active) return null;

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;

  await prisma.masterAdminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  }).catch(() => null);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  } satisfies AdminSession;
}

export function createAdminSessionToken(session: AdminSession) {
  const payload = encodeJson({
    ...session,
    iat: Date.now()
  });
  return `${payload}.${sign(payload)}`;
}

export function getAdminSessionFromToken(token?: string | null): AdminSession | null {
  if (!token) return null;

  // Backward compatibility: older deployments stored ADMIN_SECRET directly.
  // The next login replaces it with a signed token.
  if (allowsLegacyAdminSecret() && getAdminSecret() && safeEqual(token, getAdminSecret())) {
    return {
      id: "legacy-admin",
      email: "legacy@admin.local",
      name: "Administrador Master",
      role: "OWNER",
      legacy: true
    };
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  if (!safeEqual(signature, sign(payload))) return null;

  const data = decodeJson<AdminSession & { iat?: number }>(payload);
  if (!data?.iat || !data.id || !data.email || !data.role) return null;

  const age = Date.now() - Number(data.iat);
  if (!Number.isFinite(age) || age < 0 || age > SESSION_TTL_MS) return null;

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    role: data.role
  };
}

export function verifyAdminSessionToken(token?: string | null) {
  return Boolean(getAdminSessionFromToken(token));
}

export function verifyAdminCronSecret(value?: string | null) {
  return verifyAdminPassword(value ?? "");
}
