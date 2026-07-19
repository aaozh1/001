import { NextResponse } from "next/server";
import { jsonError, readJson } from "@/lib/http";
import { requireDesigner } from "@/lib/projects/guard";
import { optionSchema } from "@/lib/spec/option-schemas";
import { addOption, removeOption } from "@/lib/spec/option-service";

type Params = { params: Promise<{ id: string }> };

// POST /api/items/:id/options {materialId} — attach a material option (≤4).
export async function POST(request: Request, { params }: Params) {
  const guard = await requireDesigner({ manage: true });
  if (!guard.ok) return guard.response;

  const parsed = optionSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("invalid_input", "Validation failed", 422);

  const { id } = await params;
  const result = await addOption(guard.ctx, id, parsed.data.materialId);
  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : 422;
    return jsonError(result.error, "Cannot add option", status);
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

// DELETE /api/items/:id/options {materialId} — drop an option.
export async function DELETE(request: Request, { params }: Params) {
  const guard = await requireDesigner({ manage: true });
  if (!guard.ok) return guard.response;

  const parsed = optionSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("invalid_input", "Validation failed", 422);

  const { id } = await params;
  const removed = await removeOption(guard.ctx, id, parsed.data.materialId);
  if (!removed) return jsonError("not_found", "Option not found", 404);
  return NextResponse.json({ ok: true });
}
