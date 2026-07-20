import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/http";
import { requireDesigner } from "@/lib/projects/guard";
import { applySetToProject, deleteMaterialSet } from "@/lib/templates/service";

type Params = { params: Promise<{ id: string }> };

const applySchema = z.object({ projectId: z.string().min(1) });

// POST /api/material-sets/:id — apply the set to a project (Studio).
export async function POST(request: Request, { params }: Params) {
  const guard = await requireDesigner({ manage: true });
  if (!guard.ok) return guard.response;

  const parsed = applySchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("invalid_input", "Validation failed", 422);

  const { id } = await params;
  const result = await applySetToProject(guard.ctx, id, parsed.data.projectId);
  if (!result.ok) {
    if (result.error === "gated") return jsonError("studio_required", "Studio plan required", 403);
    return jsonError("not_found", "Set or project not found", 404);
  }
  return NextResponse.json(result);
}

// DELETE /api/material-sets/:id
export async function DELETE(_request: Request, { params }: Params) {
  const guard = await requireDesigner({ manage: true });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const deleted = await deleteMaterialSet(guard.ctx, id);
  if (!deleted) return jsonError("not_found", "Set not found", 404);
  return NextResponse.json({ ok: true });
}
