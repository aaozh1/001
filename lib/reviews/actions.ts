"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { getDesignerContext } from "@/lib/projects/service";
import { addReview } from "./service";

const reviewSchema = z.object({
  stars: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().max(500).optional(),
});

export async function addReviewAction(
  materialId: string,
  raw: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "unauthorized" };
  const ctx = await getDesignerContext(session.user.id);
  if (!ctx) return { ok: false, error: "forbidden" };

  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const result = await addReview(ctx.userId, ctx.orgId, materialId, {
    stars: parsed.data.stars,
    body: parsed.data.body?.trim() || null,
  });
  if (result.ok) {
    revalidatePath(`/designer/catalog/${materialId}`);
    revalidatePath(`/catalog/${materialId}`);
  }
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
