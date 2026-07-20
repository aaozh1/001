import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { jsonError, readJson } from "@/lib/http";
import { markAllRead, markRead } from "@/lib/notifications/service";

const schema = z.object({ id: z.string().min(1).max(60).optional() });

// POST /api/notifications/read — mark one (with id) or all as read.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError("unauthorized", "Login required", 401);
  const parsed = schema.safeParse((await readJson(request)) ?? {});
  if (!parsed.success) return jsonError("invalid_input", "Validation failed", 422);
  if (parsed.data.id) await markRead(session.user.id, parsed.data.id);
  else await markAllRead(session.user.id);
  return NextResponse.json({ ok: true });
}
