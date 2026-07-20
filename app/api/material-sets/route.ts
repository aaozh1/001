import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/http";
import { requireDesigner } from "@/lib/projects/guard";
import { listMaterialSets, saveSetFromProject } from "@/lib/templates/service";

const saveSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
});

// GET /api/material-sets — the org's sets with material summaries.
export async function GET() {
  const guard = await requireDesigner();
  if (!guard.ok) return guard.response;
  return NextResponse.json({ sets: await listMaterialSets(guard.ctx.orgId) });
}

// POST /api/material-sets — save a project's option palette as a set (Studio).
export async function POST(request: Request) {
  const guard = await requireDesigner({ manage: true });
  if (!guard.ok) return guard.response;

  const parsed = saveSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("invalid_input", "Validation failed", 422);

  const result = await saveSetFromProject(guard.ctx, parsed.data.projectId, parsed.data.name);
  if (!result.ok) {
    if (result.error === "gated") return jsonError("studio_required", "Studio plan required", 403);
    if (result.error === "not_found") return jsonError("not_found", "Project not found", 404);
    return jsonError("empty", "Project has no material options", 422);
  }
  return NextResponse.json(
    { setId: result.setId, materialCount: result.materialCount },
    { status: 201 },
  );
}
