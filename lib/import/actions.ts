"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { managerContextOrThrow } from "@/lib/projects/manager-context";
import { createProjectFromImport } from "./service";

export type ImportActionState = { error?: string };

// Hard bounds for a single import. The parse API's 1000-row cap only limits
// the PREVIEW — this action is the write path, so it must enforce its own
// caps or a crafted payload bypasses every spec-item field limit.
const MAX_IMPORT_ROWS = 1000;
const MAX_COLS = 40;
const cell = z.string().max(500);

const importActionSchema = z.object({
  name: z.string().trim().min(1).max(160),
  buildingType: z.string().trim().max(120).optional(),
  header: z.array(cell).max(MAX_COLS),
  rows: z.array(z.array(cell).max(MAX_COLS)).min(1).max(MAX_IMPORT_ROWS),
  mapping: z.object({
    code: z.number().int().min(0).max(MAX_COLS).optional(),
    zone: z.number().int().min(0).max(MAX_COLS).optional(),
    category: z.number().int().min(0).max(MAX_COLS).optional(),
    qty: z.number().int().min(0).max(MAX_COLS).optional(),
    qtyUnit: z.number().int().min(0).max(MAX_COLS).optional(),
  }),
});

export async function createProjectFromImportAction(
  input: unknown,
): Promise<ImportActionState> {
  const ctx = await managerContextOrThrow();

  const parsed = importActionSchema.safeParse(input);
  if (!parsed.success) {
    const nameIssue = parsed.error.issues.some((i) => i.path[0] === "name");
    return { error: nameIssue ? "name_required" : "invalid_input" };
  }

  const result = await createProjectFromImport(ctx, {
    name: parsed.data.name,
    buildingType: parsed.data.buildingType?.trim() || null,
    header: parsed.data.header,
    rows: parsed.data.rows,
    mapping: parsed.data.mapping,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/designer/projects");
  redirect(`/designer/projects/${result.projectId}`);
}
