"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { managerContextOrThrow } from "@/lib/projects/manager-context";
import { addOption } from "@/lib/spec/option-service";
import { MAX_SPEC_OPTIONS } from "@/lib/spec/options";

export interface AddTargetItem {
  id: string;
  code: string;
  zone: string | null;
  optionCount: number;
  full: boolean;
}
export interface AddTargetProject {
  id: string;
  name: string;
  items: AddTargetItem[];
}

/** Projects (+ their spec lines) a material can be added to. Managers only. */
export async function listAddTargetsAction(): Promise<AddTargetProject[]> {
  const ctx = await managerContextOrThrow();
  const projects = await prisma.project.findMany({
    where: { orgId: ctx.orgId, status: { not: "archived" } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      specItems: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, code: true, zone: true, _count: { select: { options: true } } },
      },
    },
  });
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    items: p.specItems.map((i) => ({
      id: i.id,
      code: i.code,
      zone: i.zone,
      optionCount: i._count.options,
      full: i._count.options >= MAX_SPEC_OPTIONS,
    })),
  }));
}

export type AddResult = { ok: boolean; error?: string };

/** Add a catalog material to a spec line as an option (reuses the 1.3 rules). */
export async function addMaterialToItemAction(
  projectId: string,
  itemId: string,
  materialId: string,
): Promise<AddResult> {
  const ctx = await managerContextOrThrow();
  const result = await addOption(ctx, itemId, materialId);
  if (result.ok) revalidatePath(`/designer/projects/${projectId}`);
  return { ok: result.ok, error: result.ok ? undefined : result.error };
}
