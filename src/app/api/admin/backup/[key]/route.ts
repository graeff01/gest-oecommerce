import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, getAdminSessionFromToken } from "@/lib/admin-auth";
import { buildClientBackup } from "@/lib/admin-backups";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ key: string }> }) {
  const cookieStore = await cookies();
  const session = getAdminSessionFromToken(cookieStore.get(ADMIN_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { key } = await params;
  const client = await prisma.adminClient.findUnique({
    where: { key },
    select: { id: true, key: true }
  });
  if (!client) {
    return NextResponse.json({ error: "client_not_found" }, { status: 404 });
  }

  const backup = await buildClientBackup(client.id);
  const filename = `backup-${client.key}-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(backup.json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
