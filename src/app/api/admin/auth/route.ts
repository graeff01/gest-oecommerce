import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  createAdminSessionToken,
  verifyAdminPassword,
  verifyMasterAdminCredentials
} from "@/lib/admin-auth";

const attempts = new Map<string, { count: number; resetAt: number }>();

function clientKey(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function hitRateLimit(req: NextRequest) {
  const key = clientKey(req);
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return false;
  }
  current.count++;
  return current.count > 8;
}

function clearRateLimit(req: NextRequest) {
  attempts.delete(clientKey(req));
}

export async function POST(req: NextRequest) {
  if (hitRateLimit(req)) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  const { email = "", password = "", secret = "" } = await req.json();
  const session = email && password
    ? await verifyMasterAdminCredentials(String(email), String(password))
    : null;

  const legacySession = !session && verifyAdminPassword(String(secret || password))
    ? {
        id: "legacy-admin",
        email: "legacy@admin.local",
        name: "Administrador Master",
        role: "OWNER",
        legacy: true
      }
    : null;

  const adminSession = session ?? legacySession;

  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  clearRateLimit(req);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, createAdminSessionToken(adminSession), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });

  return NextResponse.json({ ok: true });
}
