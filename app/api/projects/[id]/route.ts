import { NextResponse } from "next/server";
import { jsonError, readJson } from "@/lib/http";
import { requireDesigner } from "@/lib/projects/guard";
import { updateProjectSchema } from "@/lib/projects/schemas";
import {
  deleteProject,
  getProject,
  updateProject,
} from "@/lib/projects/service";

type Params = { params: Promise<{ id: string }> };

// GET /api/projects/:id
export async function GET(_request: Request, { params }: Params) {
  const guard = await requireDesigner();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const project = await getProject(guard.ctx.orgId, id);
  if (!project) return jsonError("not_found", "Project not found", 404);
  return NextResponse.json({ project });
}

// PATCH /api/projects/:id — rename / building type / status (owner/editor).
export async function PATCH(request: Request, { params }: Params) {
  const guard = await requireDesigner({ manage: true });
  if (!guard.ok) return guard.response;

  const parsed = updateProjectSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonError("invalid_input", "Validation failed", 422);
  }

  const { id } = await params;
  const project = await updateProject(guard.ctx, id, parsed.data);
  if (!project) return jsonError("not_found", "Project not found", 404);
  return NextResponse.json({ project });
}

// DELETE /api/projects/:id (owner/editor).
export async function DELETE(_request: Request, { params }: Params) {
  const guard = await requireDesigner({ manage: true });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const deleted = await deleteProject(guard.ctx, id);
  if (!deleted) return jsonError("not_found", "Project not found", 404);
  return NextResponse.json({ ok: true });
}
