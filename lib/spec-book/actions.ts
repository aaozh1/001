"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { managerContextOrThrow } from "@/lib/projects/manager-context";
import { createSpecBook } from "./service";

export type CreateSpecBookResult = { ok: boolean; version?: number };

/** Freeze a new Spec Book version and return its number for download. */
export async function createSpecBookAction(
  projectId: string,
): Promise<CreateSpecBookResult> {
  const ctx = await managerContextOrThrow();
  const locale = await getLocale();
  const display = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    dateStyle: "medium",
  }).format(new Date());

  const result = await createSpecBook(ctx, projectId, display);
  if (!result) return { ok: false };
  revalidatePath(`/designer/projects/${projectId}`);
  return { ok: true, version: result.version };
}
