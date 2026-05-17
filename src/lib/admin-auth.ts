import "server-only";

import crypto from "node:crypto";

export const ADMIN_COOKIE = "gestao_admin_session";

function getAdminSecret() {
  return process.env.ADMIN_SECRET ?? "";
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

function sign(payload: string) {
  return crypto.createHmac("sha256", getSigningSecret()).update(payload).digest("base64url");
}

export function verifyAdminPassword(secret: string) {
  const expected = getAdminSecret();
  if (!expected || !secret) return false;
  return safeEqual(secret, expected);
}

export function createAdminSessionToken() {
  const issuedAt = Date.now().toString();
  return `${issuedAt}.${sign(issuedAt)}`;
}

export function verifyAdminSessionToken(token?: string | null) {
  if (!token) return false;

  // Backward compatibility: older deployments stored ADMIN_SECRET directly.
  // The next login replaces it with a signed token.
  if (getAdminSecret() && safeEqual(token, getAdminSecret())) {
    return true;
  }

  const [issuedAt, signature] = token.split(".");
  if (!issuedAt || !signature) return false;
  if (!safeEqual(signature, sign(issuedAt))) return false;

  const age = Date.now() - Number(issuedAt);
  return Number.isFinite(age) && age >= 0 && age <= 12 * 60 * 60 * 1000;
}

export function verifyAdminCronSecret(value?: string | null) {
  return verifyAdminPassword(value ?? "");
}
