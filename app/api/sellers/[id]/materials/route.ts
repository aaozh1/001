import { NextResponse } from "next/server";
import { requireDesigner } from "@/lib/projects/guard";
import { listSellerMaterials } from "@/lib/materials/service";

type Params = { params: Promise<{ id: string }> };

// GET /api/sellers/:id/materials — a seller's published catalog (neutral order).
export async function GET(_request: Request, { params }: Params) {
  const guard = await requireDesigner();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const materials = await listSellerMaterials(id);
  return NextResponse.json({ materials });
}
