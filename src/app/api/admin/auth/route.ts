import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  allowsLegacyAdminSecret,
  createAdminSessionToken,
  verifyAdminPassword,
  verifyMasterAdminCredentials
} from "@/lib/admin-auth";
import { checkSecurityRateLimit, clientIpFromRequest, logSecurityEvent, normalizeIdentifier } from "@/lib/security";

export async function POST(req: NextRequest) {
  const ip = clientIpFromRequest(req);
  const userAgent = req.headers.get("user-agent");
  const body = await req.json().catch(() => ({}));
  const { email = "", password = "", secret = "" } = body;
  const identifier = normalizeIdentifier(String(email || "admin-master")) ?? "admin-master";

  const limit = await checkSecurityRateLimit({
    scope: "admin",
    action: "LOGIN",
    identifier,
    ip,
    windowSeconds: 10 * 60,
    maxAttempts: 8,
    blockSeconds: 10 * 60
  });

  if (!limit.allowed) {
    await logSecurityEvent({
      scope: "admin",
      action: "LOGIN_BLOCKED",
      identifier,
      ip,
      userAgent,
      success: false,
      severity: "critical"
    });
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  const session = email && password
    ? await verifyMasterAdminCredentials(String(email), String(password))
    : null;

  const legacySession = !session && allowsLegacyAdminSecret() && verifyAdminPassword(String(secret || password))
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
    await logSecurityEvent({ scope: "admin", action: "LOGIN", identifier, ip, userAgent, success: false });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isLegacySession = "legacy" in adminSession ? Boolean(adminSession.legacy) : false;

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, createAdminSessionToken(adminSession), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });

  await logSecurityEvent({
    scope: "admin",
    action: "LOGIN",
    identifier: adminSession.email,
    ip,
    userAgent,
    success: true,
    severity: isLegacySession ? "warning" : "info",
    metadata: { legacy: isLegacySession }
  });

  return NextResponse.json({ ok: true });
}
