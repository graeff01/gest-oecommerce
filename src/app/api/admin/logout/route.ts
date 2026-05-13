import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("gestao_admin_session");
  return NextResponse.redirect(new URL("/admin/login", process.env.APP_URL ?? "http://localhost:3000"));
}
