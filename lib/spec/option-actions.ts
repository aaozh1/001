"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { managerContextOrThrow } from "@/lib/projects/manager-context";
import { getDesignerContext } from "@/lib/projects/service";
import {
  addOption,
  clearConfirmation,
  confirmMaterial,
  removeOption,
} from "./option-service";
import {
  listMaterialsForPicker,
  type MaterialSummary,
} from "@/lib/materials/service";

function revalidateProject(projectId: string) {
  revalidatePath(`/designer/projects/${projectId}`);
}

export type OptionActionResult = { ok: boolean; error?: string };

export async function addOptionAction(
  projectId: string,
  itemId: string,
  materialId: string,
): Promise<OptionActionResult> {
  const ctx = await managerContextOrThrow();
  const result = await addOption(ctx, itemId, materialId);
  if (result.ok) revalidateProject(projectId);
  return { ok: result.ok, error: result.ok ? undefined : result.error };
}

export async function removeOptionAction(
  projectId: string,
  itemId: string,
  materialId: string,
): Promise<OptionActionResult> {
  const ctx = await managerContextOrThrow();
  const ok = await removeOption(ctx, itemId, materialId);
  if (ok) revalidateProject(projectId);
  return { ok, error: ok ? undefined : "not_found" };
}

export async function confirmMaterialAction(
  projectId: string,
  itemId: string,
  materialId: string,
): Promise<OptionActionResult> {
  const ctx = await managerContextOrThrow();
  const result = await confirmMaterial(ctx, itemId, materialId);
  if (result.ok) revalidateProject(projectId);
  return { ok: result.ok, error: result.ok ? undefined : result.error };
}

export async function clearConfirmationAction(
  projectId: string,
  itemId: string,
): Promise<OptionActionResult> {
  const ctx = await managerContextOrThrow();
  const ok = await clearConfirmation(ctx, itemId);
  if (ok) revalidateProject(projectId);
  return { ok, error: ok ? undefined : "not_found" };
}

/** Read-only search for the picker modal (any designer member). */
export async function searchMaterialsAction(
  query: string,
): Promise<MaterialSummary[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  const ctx = await getDesignerContext(session.user.id);
  if (!ctx) return [];
  return listMaterialsForPicker({ query, limit: 30 });
}
