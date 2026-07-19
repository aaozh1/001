import { NextResponse } from "next/server";
import { jsonError, readJson } from "@/lib/http";
import { requireDesigner } from "@/lib/projects/guard";
import { reorderSpecItemsSchema } from "@/lib/spec/schemas";
import { reorderItems } from "@/lib/spec/service";

type Params = { params: Promise<{ id: string }> };

// POST /api/projects/:id/items/reorder — persist a new row order (owner/editor).
export async function POST(request: Request, { params }: Params) {
  const guard = await requireDesigner({ manage: true });
  if (!guard.ok) return guard.response;

  const parsed = reorderSpecItemsSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("invalid_input", "Validation failed", 422);

  const { id } = await params;
  const result = await reorderItems(guard.ctx, id, parsed.data.orderedIds);
  if (result === "not_found") return jsonError("not_found", "Project not found", 404);
  if (result === "invalid") {
    return jsonError("invalid_order", "Order must be a permutation of the items", 422);
  }
  return NextResponse.json({ ok: true });
}
