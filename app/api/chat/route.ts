import { NextResponse } from "next/server";
import { jsonError, readJson } from "@/lib/http";
import { requireDesigner } from "@/lib/projects/guard";
import { openThreadSchema } from "@/lib/chat/schemas";
import { getOrCreateThread, listDesignerThreads } from "@/lib/chat/service";

// POST /api/chat — designer opens (or reuses) a thread with a seller for a
// project. Designer-initiated: chat is an engagement channel the designer
// starts, so it needs a managing role (viewers are read-only).
export async function POST(request: Request) {
  const guard = await requireDesigner({ manage: true });
  if (!guard.ok) return guard.response;

  const parsed = openThreadSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("invalid_input", "Validation failed", 422);

  const threadId = await getOrCreateThread(guard.ctx, parsed.data);
  if (!threadId) return jsonError("not_found", "Project or seller not found", 404);
  return NextResponse.json({ threadId }, { status: 201 });
}

// GET /api/chat — designer lists their threads.
export async function GET() {
  const guard = await requireDesigner();
  if (!guard.ok) return guard.response;
  return NextResponse.json({ threads: await listDesignerThreads(guard.ctx.orgId) });
}
