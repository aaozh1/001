"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { canQuote, getSellerContext } from "@/lib/seller/context";
import { quoteSchema } from "./schemas";
import { submitQuote } from "./service";

export type SubmitQuoteActionResult = { ok: boolean; error?: string };

export async function submitQuoteAction(
  rfqId: string,
  raw: unknown,
): Promise<SubmitQuoteActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "unauthorized" };
  const ctx = await getSellerContext(session.user.id);
  if (!ctx || !canQuote(ctx.role)) return { ok: false, error: "forbidden" };

  const parsed = quoteSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const result = await submitQuote(ctx, rfqId, parsed.data, new Date());
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/seller/rfq");
  revalidatePath(`/seller/rfq/${rfqId}`);
  return { ok: true };
}
