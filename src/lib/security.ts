import "server-only";

import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type SecurityScope = "app" | "admin" | "api" | "system";
type Severity = "info" | "warning" | "critical";

export function clientIpFromHeaders(headers: Headers) {
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

export function clientIpFromRequest(req: NextRequest | Request) {
  return clientIpFromHeaders(req.headers);
}

function hashValue(value: string) {
  const salt = process.env.SECURITY_LOG_SALT || process.env.AUTH_SECRET || "dev-security-log-salt";
  return crypto.createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

export function normalizeIdentifier(value?: string | null) {
  return value?.trim().toLowerCase() || null;
}

export async function logSecurityEvent(input: {
  scope: SecurityScope;
  action: string;
  identifier?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  success?: boolean;
  severity?: Severity;
  metadata?: Prisma.InputJsonObject;
}) {
  try {
    await prisma.securityEvent.create({
      data: {
        scope: input.scope,
        action: input.action,
        identifier: normalizeIdentifier(input.identifier),
        ipHash: input.ip && input.ip !== "unknown" ? hashValue(input.ip) : null,
        userAgent: input.userAgent?.slice(0, 280) || null,
        success: Boolean(input.success),
        severity: input.severity ?? (input.success ? "info" : "warning"),
        metadata: input.metadata
      }
    });
  } catch {
    // Security logging must not block login or health endpoints if the DB is under stress.
  }
}

export async function checkSecurityRateLimit(input: {
  scope: SecurityScope;
  action: string;
  identifier?: string | null;
  ip?: string | null;
  windowSeconds: number;
  maxAttempts: number;
  blockSeconds?: number;
}) {
  const since = new Date(Date.now() - input.windowSeconds * 1000);
  const identifier = normalizeIdentifier(input.identifier);
  const ipHash = input.ip && input.ip !== "unknown" ? hashValue(input.ip) : null;

  const where = {
    scope: input.scope,
    action: input.action,
    success: false,
    createdAt: { gte: since },
    OR: [
      ...(identifier ? [{ identifier }] : []),
      ...(ipHash ? [{ ipHash }] : [])
    ]
  };

  if (where.OR.length === 0) return { allowed: true, remaining: input.maxAttempts };

  try {
    const failures = await prisma.securityEvent.count({ where });
    const allowed = failures < input.maxAttempts;
    return {
      allowed,
      remaining: Math.max(0, input.maxAttempts - failures),
      retryAfterSeconds: allowed ? 0 : input.blockSeconds ?? input.windowSeconds
    };
  } catch {
    // Fail open for availability; failed attempts are still logged after DB recovers.
    return { allowed: true, remaining: input.maxAttempts };
  }
}
