import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/http";
import { requireDesigner } from "@/lib/projects/guard";
import { selectQuote } from "@/lib/quote/service";

const selectSchema = z.object({ quoteId: z.string().min(1) });

type Params = { params: Promise<{ id: string }> };

// POST /api/rfq/:id/select {quoteId} — designer picks the winner (owner/editor).
export async function POST(request: Request, { params }: Params) {
  const guard = await requireDesigner({ manage: true });
  if (!guard.ok) return guard.response;

  const parsed = selectSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("invalid_input", "Validation failed", 422);

  const { id } = await params;
  const result = await selectQuote(guard.ctx, id, parsed.data.quoteId);
  if (!result.ok) {
    const status =
      result.error === "not_found" ? 404 : result.error === "closed" ? 409 : 422;
    return jsonError(result.error, "Cannot select quote", status);
  }
  return NextResponse.json({ ok: true });
}
