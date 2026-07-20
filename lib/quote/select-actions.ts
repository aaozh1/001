"use server";

import { revalidatePath } from "next/cache";
import { managerContextOrThrow } from "@/lib/projects/manager-context";
import { selectQuote } from "./service";

export type SelectQuoteActionResult = { ok: boolean; error?: string };

export async function selectQuoteAction(
  projectId: string,
  rfqId: string,
  quoteId: string,
): Promise<SelectQuoteActionResult> {
  const ctx = await managerContextOrThrow();
  const result = await selectQuote(ctx, rfqId, quoteId);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath(`/designer/projects/${projectId}`);
  return { ok: true };
}
