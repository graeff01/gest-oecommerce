import "server-only";

import { prisma } from "@/lib/prisma";
import { fetchAllClients, fetchClientSnapshot, ClientSnapshot } from "@/lib/admin-clients";
import type { AdminClient } from "@prisma/client";

function calcHealth(snap: ClientSnapshot): number {
  let score = 0;
  if (snap.online) score += 30;
  if (snap.status === "ACTIVE") score += 20;
  if (snap.salesLast7 >= 5) score += 25;
  else if (snap.salesLast7 > 0) score += 18;
  else if (snap.salesLast30 > 0) score += 8;
  const critical = snap.alerts.filter((a) => a.level === "critical").length;
  if (critical === 0) score += 15;
  else score -= critical * 5;
  const warnings = snap.alerts.filter((a) => a.level === "warning").length;
  if (warnings === 0) score += 10;
  else score -= warnings * 2;
  return Math.max(0, Math.min(100, score));
}

export async function captureSnapshotForClient(client: AdminClient): Promise<void> {
  const snap = await fetchClientSnapshot({
    id: client.id,
    key: client.key,
    name: client.name,
    storeName: client.storeName,
    appUrl: client.appUrl,
    url: client.databaseUrl,
    status: client.status,
    plan: client.plan,
    monthlyFee: client.monthlyFee === null ? null : Number(client.monthlyFee),
    renewalDay: client.renewalDay,
    notes: client.notes,
    source: "database"
  });

  const criticalCount = snap.alerts.filter((a) => a.level === "critical").length;

  await prisma.adminClientSnapshot.create({
    data: {
      clientId: client.id,
      online: snap.online,
      salesLast7: snap.salesLast7,
      salesLast30: snap.salesLast30,
      totalCustomers: snap.totalCustomers,
      newCustomers30: snap.newCustomersLast30,
      totalProducts: snap.totalProducts,
      activeUsers: snap.activeUsers,
      totalUsers: snap.totalUsers,
      alertCount: snap.alerts.length,
      criticalCount,
      healthScore: calcHealth(snap)
    }
  });
}

export async function captureAllSnapshots(): Promise<{ captured: number }> {
  const clients = await prisma.adminClient.findMany();
  let captured = 0;
  await Promise.all(
    clients.map(async (client) => {
      try {
        await captureSnapshotForClient(client);
        captured++;
      } catch {
        // swallow - one client failing should not block others
      }
    })
  );
  // Best-effort cleanup: keep last 180 days only
  const cutoff = new Date(Date.now() - 180 * 86400000);
  await prisma.adminClientSnapshot.deleteMany({ where: { capturedAt: { lt: cutoff } } }).catch(() => null);
  return { captured };
}

export async function getClientSnapshotHistory(clientId: string, days = 30) {
  const since = new Date(Date.now() - days * 86400000);
  return prisma.adminClientSnapshot.findMany({
    where: { clientId, capturedAt: { gte: since } },
    orderBy: { capturedAt: "asc" }
  });
}
