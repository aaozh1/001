import { NextResponse } from "next/server";
import { jsonError, readJson } from "@/lib/http";
import { requireDesigner } from "@/lib/projects/guard";
import { updateSpecItemSchema } from "@/lib/spec/schemas";
import { deleteItem, updateItem } from "@/lib/spec/service";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/items/:id — inline edit code/zone/qty/category (owner/editor).
export async function PATCH(request: Request, { params }: Params) {
  const guard = await requireDesigner({ manage: true });
  if (!guard.ok) return guard.response;

  const parsed = updateSpecItemSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("invalid_input", "Validation failed", 422);

  const { id } = await params;
  const item = await updateItem(guard.ctx, id, parsed.data);
  if (!item) return jsonError("not_found", "Item not found", 404);
  return NextResponse.json({ item });
}

// DELETE /api/items/:id (owner/editor).
export async function DELETE(_request: Request, { params }: Params) {
  const guard = await requireDesigner({ manage: true });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const deleted = await deleteItem(guard.ctx, id);
  if (!deleted) return jsonError("not_found", "Item not found", 404);
  return NextResponse.json({ ok: true });
}
