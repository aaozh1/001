import { NextResponse } from "next/server";
import { jsonError, readJson } from "@/lib/http";
import { requireDesigner } from "@/lib/projects/guard";
import { confirmSchema } from "@/lib/spec/option-schemas";
import { confirmMaterial } from "@/lib/spec/option-service";

type Params = { params: Promise<{ id: string }> };

// POST /api/items/:id/confirm {materialId} — confirm one option (status→chosen).
export async function POST(request: Request, { params }: Params) {
  const guard = await requireDesigner({ manage: true });
  if (!guard.ok) return guard.response;

  const parsed = confirmSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("invalid_input", "Validation failed", 422);

  const { id } = await params;
  const result = await confirmMaterial(guard.ctx, id, parsed.data.materialId);
  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : 422;
    return jsonError(result.error, "Cannot confirm material", status);
  }
  return NextResponse.json({ ok: true });
}
