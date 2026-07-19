import { NextResponse } from "next/server";
import { jsonError, readJson } from "@/lib/http";
import { requireDesigner } from "@/lib/projects/guard";
import { createProjectSchema } from "@/lib/projects/schemas";
import { createProject, listProjects } from "@/lib/projects/service";

// GET /api/projects — projects in the caller's designer org.
export async function GET() {
  const guard = await requireDesigner();
  if (!guard.ok) return guard.response;

  const projects = await listProjects(guard.ctx.orgId);
  return NextResponse.json({ projects });
}

// POST /api/projects — create a project (owner/editor only).
export async function POST(request: Request) {
  const guard = await requireDesigner({ manage: true });
  if (!guard.ok) return guard.response;

  const parsed = createProjectSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonError("invalid_input", "Validation failed", 422);
  }

  const project = await createProject(guard.ctx, parsed.data);
  return NextResponse.json({ project }, { status: 201 });
}
