import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE = "gestao_admin_session";

export async function POST(req: NextRequest) {
  const { secret } = await req.json();
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret || secret !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, adminSecret, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });

  return NextResponse.json({ ok: true });
}
