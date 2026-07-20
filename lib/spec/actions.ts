"use server";

import { revalidatePath } from "next/cache";
import { managerContextOrThrow } from "@/lib/projects/manager-context";
import {
  createSpecItemSchema,
  updateSpecItemSchema,
  type UpdateSpecItemInput,
} from "./schemas";
import {
  type ItemSnapshot,
  createItem,
  deleteItem,
  deleteItemReturningSnapshot,
  reorderItems,
  restoreItem,
  updateItem,
} from "./service";
import { z } from "zod";

const snapshotSchema = z.object({
  code: z.string().min(1).max(40),
  zone: z.string().max(120).nullable(),
  category: z.string().max(120).nullable(),
  qty: z.string().max(40).nullable(),
  qtyUnit: z.string().max(40).nullable(),
  sortOrder: z.number().int().min(0).max(100000),
  confirmedMaterialId: z.string().max(60).nullable(),
  options: z
    .array(z.object({ materialId: z.string().min(1).max(60), isConfirmed: z.boolean() }))
    .max(4),
});

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

export type DeleteUndoableResult =
  | { ok: true; snapshot: ItemSnapshot }
  | { ok: false; error: string };

/** Delete a row and hand back a snapshot the client can use to undo. */
export async function deleteItemUndoableAction(
  projectId: string,
  itemId: string,
): Promise<DeleteUndoableResult> {
  const ctx = await managerContextOrThrow();
  const result = await deleteItemReturningSnapshot(ctx, itemId);
  if (!result) return { ok: false, error: "not_found" };
  revalidateProject(projectId);
  return { ok: true, snapshot: result.snapshot };
}

export async function restoreItemAction(
  projectId: string,
  rawSnapshot: unknown,
): Promise<SpecActionResult> {
  const ctx = await managerContextOrThrow();
  const parsed = snapshotSchema.safeParse(rawSnapshot);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const ok = await restoreItem(ctx, projectId, parsed.data);
  if (!ok) return { ok: false, error: "not_found" };
  revalidateProject(projectId);
  return { ok: true };
}
