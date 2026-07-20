"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { managerContextOrThrow } from "@/lib/projects/manager-context";
import { type BoardLayout, boardLayoutSchema, normalizeBoardLayout } from "./board";

export type BoardActionResult = { ok: boolean; error?: string };

// Save the Material Board layout (drag/resize/z-order) for a project. The
// layout is normalised server-side so junk coordinates can't be stored.
export async function saveBoardLayoutAction(
  projectId: string,
  layout: BoardLayout,
): Promise<BoardActionResult> {
  const ctx = await managerContextOrThrow();
  const parsed = boardLayoutSchema.safeParse(layout);
  if (!parsed.success) return { ok: false, error: "invalid" };

  // Ownership gate — same rule as every other project mutation.
  const project = await prisma.project.findFirst({
    where: { id: projectId, orgId: ctx.orgId },
    select: { id: true },
  });
  if (!project) return { ok: false, error: "not_found" };

  const normalized = normalizeBoardLayout(
    parsed.data,
    parsed.data.tiles.map((t) => t.key),
  );
  await prisma.project.update({
    where: { id: project.id },
    data: { boardLayout: normalized as unknown as Prisma.InputJsonValue },
  });
  revalidatePath(`/designer/projects/${projectId}`);
  return { ok: true };
}
