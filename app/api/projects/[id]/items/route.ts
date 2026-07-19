import { NextResponse } from "next/server";
import { jsonError, readJson } from "@/lib/http";
import { requireDesigner } from "@/lib/projects/guard";
import { createSpecItemSchema } from "@/lib/spec/schemas";
import { createItem, listItems } from "@/lib/spec/service";
import { getProject } from "@/lib/projects/service";

type Params = { params: Promise<{ id: string }> };

// GET /api/projects/:id/items — the project's spec schedule.
export async function GET(_request: Request, { params }: Params) {
  const guard = await requireDesigner();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const project = await getProject(guard.ctx.orgId, id);
  if (!project) return jsonError("not_found", "Project not found", 404);

  const items = await listItems(id);
  return NextResponse.json({ items });
}

// POST /api/projects/:id/items — add a spec line (owner/editor).
export async function POST(request: Request, { params }: Params) {
  const guard = await requireDesigner({ manage: true });
  if (!guard.ok) return guard.response;

  const parsed = createSpecItemSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("invalid_input", "Validation failed", 422);

  const { id } = await params;
  const item = await createItem(guard.ctx, id, parsed.data);
  if (!item) return jsonError("not_found", "Project not found", 404);
  return NextResponse.json({ item }, { status: 201 });
}
