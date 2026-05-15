import { connection } from "next/server";
import { AnimatedShell } from "@/components/animated-shell";
import { DashboardGrid } from "@/components/dashboard-grid";
import { getSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard";
import { prisma } from "@/lib/prisma";
import type { WidgetLayoutItem } from "@/lib/dashboard-types";

export default async function DashboardPage() {
  await connection();

  const [data, session] = await Promise.all([getDashboardData(), getSession()]);

  let savedLayout: WidgetLayoutItem[] | null = null;
  if (session?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { dashboardLayout: true }
    });
    if (user?.dashboardLayout) {
      savedLayout = user.dashboardLayout as unknown as WidgetLayoutItem[];
    }
  }

  return (
    <AnimatedShell className="pb-6">
      <DashboardGrid data={data} savedLayout={savedLayout} />
    </AnimatedShell>
  );
}
