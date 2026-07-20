"use server";

import { revalidatePath } from "next/cache";
import { managerContextOrThrow } from "@/lib/projects/manager-context";
import { addOption, confirmMaterial } from "@/lib/spec/option-service";
import { type VeResult, findVeAlternatives, recordVeSwap } from "./service";

// VE Finder actions — Pro-gated in the service; the UI shows an upgrade CTA
// on `gated`.

export async function findVeAction(itemId: string): Promise<VeResult> {
  const ctx = await managerContextOrThrow();
  return findVeAlternatives(ctx, itemId);
}

export type VeSwapResult = { ok: boolean; error?: string };

/** Take a suggestion: add it as an option, confirm it, log VE history. */
export async function applyVeSwapAction(
  projectId: string,
  itemId: string,
  fromMaterialId: string,
  toMaterialId: string,
  savingPercent: number,
): Promise<VeSwapResult> {
  const ctx = await managerContextOrThrow();
  if (!Number.isFinite(savingPercent) || savingPercent < 0 || savingPercent > 100) {
    return { ok: false, error: "invalid" };
  }

  const added = await addOption(ctx, itemId, toMaterialId);
  // "duplicate" is fine — the material is already an option; confirming it is
  // the point. A full row (4/4) can't take the suggestion without a removal.
  if (!added.ok && added.error === "limit") return { ok: false, error: "limit" };
  if (!added.ok && added.error !== "duplicate") return { ok: false, error: added.error };
  const confirmed = await confirmMaterial(ctx, itemId, toMaterialId);
  if (!confirmed.ok) return { ok: false, error: confirmed.error };

  await recordVeSwap(ctx, itemId, fromMaterialId, toMaterialId, savingPercent);
  revalidatePath(`/designer/projects/${projectId}`);
  return { ok: true };
}
