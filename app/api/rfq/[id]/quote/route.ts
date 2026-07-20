import { NextResponse } from "next/server";
import { jsonError, readJson } from "@/lib/http";
import { requireSeller } from "@/lib/seller/context";
import { quoteSchema } from "@/lib/quote/schemas";
import { submitQuote } from "@/lib/quote/service";

type Params = { params: Promise<{ id: string }> };

// POST /api/rfq/:id/quote — a seller answers an RFQ they received.
export async function POST(request: Request, { params }: Params) {
  const guard = await requireSeller({ quote: true });
  if (!guard.ok) return guard.response;

  const parsed = quoteSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("invalid_input", "Validation failed", 422);

  const { id } = await params;
  const result = await submitQuote(guard.ctx, id, parsed.data, new Date());
  if (!result.ok) {
    if (result.error === "closed") {
      return jsonError("rfq_closed", "RFQ is closed — quote can no longer change", 409);
    }
    return jsonError("not_found", "RFQ not found", 404);
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
