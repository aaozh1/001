import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/http";
import { requireDesigner } from "@/lib/projects/guard";
import {
  createProjectFromTemplate,
  deleteTemplate,
  updateTemplate,
} from "@/lib/templates/service";

type Params = { params: Promise<{ id: string }> };

const useSchema = z.object({ name: z.string().trim().min(1).max(160) });

const lineSchema = z.object({
  code: z.string().trim().min(1).max(40),
  zone: z.string().trim().max(120).nullish(),
  category: z.string().trim().max(120).nullish(),
  qtyUnit: z.string().trim().max(40).nullish(),
});
const editSchema = z.object({
  name: z.string().trim().min(1).max(160),
  lines: z.array(lineSchema).min(1).max(200),
});

// POST /api/templates/:id — start a new project from this template (Studio).
export async function POST(request: Request, { params }: Params) {
  const guard = await requireDesigner({ manage: true });
  if (!guard.ok) return guard.response;

  const parsed = useSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("invalid_input", "Validation failed", 422);

  const { id } = await params;
  const result = await createProjectFromTemplate(guard.ctx, id, parsed.data.name);
  if (!result.ok) {
    if (result.error === "gated") return jsonError("studio_required", "Studio plan required", 403);
    if (result.error === "not_found") return jsonError("not_found", "Template not found", 404);
    return jsonError("empty", "Template has no lines", 422);
  }
  return NextResponse.json(
    { projectId: result.projectId, itemCount: result.itemCount },
    { status: 201 },
  );
}

// PATCH /api/templates/:id — edit name + lines (Studio). Editing a SYSTEM
// template saves an org-owned copy instead of touching the shared one.
export async function PATCH(request: Request, { params }: Params) {
  const guard = await requireDesigner({ manage: true });
  if (!guard.ok) return guard.response;

  const parsed = editSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("invalid_input", "Validation failed", 422);

  const { id } = await params;
  const result = await updateTemplate(guard.ctx, id, {
    name: parsed.data.name,
    lines: parsed.data.lines.map((l) => ({
      code: l.code,
      zone: l.zone ?? null,
      category: l.category ?? null,
      qtyUnit: l.qtyUnit ?? null,
    })),
  });
  if (!result.ok) {
    if (result.error === "gated") return jsonError("studio_required", "Studio plan required", 403);
    if (result.error === "not_found") return jsonError("not_found", "Template not found", 404);
    return jsonError("empty", "Template needs at least one line", 422);
  }
  return NextResponse.json({ templateId: result.templateId, copied: result.copied });
}

// DELETE /api/templates/:id — remove an own template (system ones are read-only).
export async function DELETE(_request: Request, { params }: Params) {
  const guard = await requireDesigner({ manage: true });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const deleted = await deleteTemplate(guard.ctx, id);
  if (!deleted) return jsonError("not_found", "Template not found", 404);
  return NextResponse.json({ ok: true });
}
