"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const layoutItemSchema = z.object({
  i: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  minW: z.number().optional(),
  minH: z.number().optional(),
  visible: z.boolean().optional()
});

export type LayoutItem = z.infer<typeof layoutItemSchema>;

export async function saveDashboardLayoutAction(layout: LayoutItem[]) {
  const user = await requireUser();
  const parsed = z.array(layoutItemSchema).parse(layout);
  await prisma.user.update({
    where: { id: user.id },
    data: { dashboardLayout: parsed as object[] }
  });
}
