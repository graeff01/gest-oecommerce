import "server-only";

import { prisma } from "@/lib/prisma";

export async function getTaskCountsByClient(): Promise<Map<string, { open: number; overdue: number }>> {
  const tasks = await prisma.adminTask
    .findMany({ where: { done: false }, select: { clientId: true, dueDate: true } })
    .catch(() => []);
  const map = new Map<string, { open: number; overdue: number }>();
  const now = new Date();
  tasks.forEach((t) => {
    const entry = map.get(t.clientId) ?? { open: 0, overdue: 0 };
    entry.open++;
    if (t.dueDate && t.dueDate < now) entry.overdue++;
    map.set(t.clientId, entry);
  });
  return map;
}

export async function getTasksForClient(clientId: string) {
  return prisma.adminTask
    .findMany({
      where: { clientId },
      orderBy: [{ done: "asc" }, { priority: "desc" }, { dueDate: "asc" }, { createdAt: "desc" }]
    })
    .catch(() => []);
}
