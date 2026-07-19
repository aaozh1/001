import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { requireDesigner } from "@/lib/projects/guard";
import { getMaterialDetail } from "@/lib/materials/service";

type Params = { params: Promise<{ id: string }> };

// GET /api/materials/:id — full spec + seller + related.
export async function GET(_request: Request, { params }: Params) {
  const guard = await requireDesigner();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const material = await getMaterialDetail(id);
  if (!material) return jsonError("not_found", "Material not found", 404);
  return NextResponse.json({ material });
}
