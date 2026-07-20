import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/http";
import { requireDesigner } from "@/lib/projects/guard";
import { listTemplates, saveTemplateFromProject } from "@/lib/templates/service";

const saveSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
});

// GET /api/templates — org + system templates (visible on any plan).
export async function GET() {
  const guard = await requireDesigner();
  if (!guard.ok) return guard.response;
  return NextResponse.json({ templates: await listTemplates(guard.ctx.orgId) });
}

// POST /api/templates — save a project's structure as a template (Studio).
export async function POST(request: Request) {
  const guard = await requireDesigner({ manage: true });
  if (!guard.ok) return guard.response;

  const parsed = saveSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("invalid_input", "Validation failed", 422);

  const result = await saveTemplateFromProject(
    guard.ctx,
    parsed.data.projectId,
    parsed.data.name,
  );
  if (!result.ok) {
    if (result.error === "gated") return jsonError("studio_required", "Studio plan required", 403);
    if (result.error === "not_found") return jsonError("not_found", "Project not found", 404);
    return jsonError("empty", "Project has no spec items", 422);
  }
  return NextResponse.json({ templateId: result.templateId }, { status: 201 });
}
