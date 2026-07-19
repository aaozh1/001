import { NextResponse } from "next/server";
import { jsonError, readJson } from "@/lib/http";
import { requireDesigner } from "@/lib/projects/guard";
import { duplicateProjectSchema } from "@/lib/projects/schemas";
import { duplicateName } from "@/lib/projects/duplicate";
import { duplicateProject, getProject } from "@/lib/projects/service";

type Params = { params: Promise<{ id: string }> };

// POST /api/projects/:id/duplicate — deep-copy the spec skeleton (owner/editor).
export async function POST(request: Request, { params }: Params) {
  const guard = await requireDesigner({ manage: true });
  if (!guard.ok) return guard.response;

  const parsed = duplicateProjectSchema.safeParse((await readJson(request)) ?? {});
  if (!parsed.success) {
    return jsonError("invalid_input", "Validation failed", 422);
  }

  const { id } = await params;
  const source = await getProject(guard.ctx.orgId, id);
  if (!source) return jsonError("not_found", "Project not found", 404);

  const name = parsed.data.name ?? duplicateName(source.name);
  const project = await duplicateProject(guard.ctx, id, name);
  if (!project) return jsonError("not_found", "Project not found", 404);
  return NextResponse.json({ project }, { status: 201 });
}
