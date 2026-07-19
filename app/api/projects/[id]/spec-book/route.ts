import { NextResponse } from "next/server";
import { getLocale } from "next-intl/server";
import { jsonError } from "@/lib/http";
import { requireDesigner } from "@/lib/projects/guard";
import { createSpecBook, listSpecBooks } from "@/lib/spec-book/service";

type Params = { params: Promise<{ id: string }> };

// GET /api/projects/:id/spec-book — list stored versions.
export async function GET(_request: Request, { params }: Params) {
  const guard = await requireDesigner();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const books = await listSpecBooks(guard.ctx.orgId, id);
  if (!books) return jsonError("not_found", "Project not found", 404);
  return NextResponse.json({ books });
}

// POST /api/projects/:id/spec-book — freeze a new version (owner/editor).
export async function POST(_request: Request, { params }: Params) {
  const guard = await requireDesigner({ manage: true });
  if (!guard.ok) return guard.response;

  const locale = await getLocale();
  const display = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    dateStyle: "medium",
  }).format(new Date());

  const { id } = await params;
  const result = await createSpecBook(guard.ctx, id, display);
  if (!result) return jsonError("not_found", "Project not found", 404);
  return NextResponse.json(result, { status: 201 });
}
