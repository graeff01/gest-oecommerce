import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const cookieName = "gestao_session";

function getSecret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    return "dev-secret-change-before-production-gestao-ecommerce-2026";
  }
  return value;
}

// Routes that don't require authentication
const PUBLIC_PATHS = ["/login", "/setup", "/api/admin"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (process.env.ADMIN_MASTER_ONLY === "1") {
    const isAdmin = pathname.startsWith("/admin");
    const isAdminApi = pathname.startsWith("/api/admin");
    const isAsset =
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon") ||
      pathname.includes(".");

    if (isAdmin || isAdminApi || isAsset) {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL("/admin", req.url));
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow Next.js internals and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(cookieName)?.value;

  if (!token) {
    // API routes return 401, pages redirect to login
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const secret = new TextEncoder().encode(getSecret());
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.delete(cookieName);
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
