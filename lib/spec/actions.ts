"use server";

import { revalidatePath } from "next/cache";
import { managerContextOrThrow } from "@/lib/projects/manager-context";
import {
  createSpecItemSchema,
  updateSpecItemSchema,
  type UpdateSpecItemInput,
} from "./schemas";
import { createItem, deleteItem, reorderItems, updateItem } from "./service";

function revalidateProject(projectId: string) {
  revalidatePath(`/designer/projects/${projectId}`);
}

export type SpecActionResult = { ok: boolean; error?: string };

export async function createItemAction(
  projectId: string,
  code: string,
): Promise<SpecActionResult> {
  const ctx = await managerContextOrThrow();
  const parsed = createSpecItemSchema.safeParse({ code });
  if (!parsed.success) return { ok: false, error: "invalid" };

  const item = await createItem(ctx, projectId, parsed.data);
  if (!item) return { ok: false, error: "not_found" };
  revalidateProject(projectId);
  return { ok: true };
}

export async function updateItemAction(
  projectId: string,
  itemId: string,
  input: UpdateSpecItemInput,
): Promise<SpecActionResult> {
  const ctx = await managerContextOrThrow();
  const parsed = updateSpecItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const item = await updateItem(ctx, itemId, parsed.data);
  if (!item) return { ok: false, error: "not_found" };
  revalidateProject(projectId);
  return { ok: true };
}

export async function deleteItemAction(
  projectId: string,
  itemId: string,
): Promise<SpecActionResult> {
  const ctx = await managerContextOrThrow();
  const deleted = await deleteItem(ctx, itemId);
  if (!deleted) return { ok: false, error: "not_found" };
  revalidateProject(projectId);
  return { ok: true };
}

export async function reorderItemsAction(
  projectId: string,
  orderedIds: string[],
): Promise<SpecActionResult> {
  const ctx = await managerContextOrThrow();
  const result = await reorderItems(ctx, projectId, orderedIds);
  if (result !== "ok") return { ok: false, error: result };
  revalidateProject(projectId);
  return { ok: true };
}
