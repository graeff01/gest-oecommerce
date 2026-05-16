import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (process.env.ADMIN_MASTER_ONLY === "1") {
    const { pathname } = request.nextUrl;
    const isAdmin = pathname.startsWith("/admin");
    const isAdminApi = pathname.startsWith("/api/admin");
    const isAsset =
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon") ||
      pathname.includes(".");

    if (isAdmin || isAdminApi || isAsset) {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL("/admin", request.url));
  }

  const token = request.cookies.get("gestao_session")?.value;
  const isLogin = request.nextUrl.pathname.startsWith("/login");

  if (!token && !isLogin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && isLogin) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|uploads|favicon.ico).*)"]
};
