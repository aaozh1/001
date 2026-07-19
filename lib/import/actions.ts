"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { managerContextOrThrow } from "@/lib/projects/manager-context";
import { createProjectFromImport } from "./service";
import type { ColumnMapping } from "./parse";

export type ImportActionState = { error?: string };

export async function createProjectFromImportAction(input: {
  name: string;
  buildingType?: string;
  header: string[];
  rows: string[][];
  mapping: ColumnMapping;
}): Promise<ImportActionState> {
  const ctx = await managerContextOrThrow();
  const name = input.name.trim();
  if (!name) return { error: "name_required" };

  const result = await createProjectFromImport(ctx, {
    name,
    buildingType: input.buildingType?.trim() || null,
    header: input.header,
    rows: input.rows,
    mapping: input.mapping,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/designer/projects");
  redirect(`/designer/projects/${result.projectId}`);
}
