import { NextResponse } from "next/server";
import { jsonError, readJson } from "@/lib/http";
import { resolveChatActor } from "@/lib/chat/access";
import { postMessageSchema } from "@/lib/chat/schemas";
import { listMessages, postMessage } from "@/lib/chat/service";

type Params = { params: Promise<{ id: string }> };

// GET /api/chat/:id/messages — poll the thread (either side). Access is enforced
// in the service: the caller's org must match the thread.
export async function GET(_request: Request, { params }: Params) {
  const actor = await resolveChatActor();
  if (!actor.ok) return actor.response;

  const { id } = await params;
  const messages = await listMessages(actor.actor.side, actor.actor.orgId, id);
  if (messages === null) return jsonError("not_found", "Thread not found", 404);
  return NextResponse.json({ messages });
}

// POST /api/chat/:id/messages — send one message (either side).
export async function POST(request: Request, { params }: Params) {
  const actor = await resolveChatActor();
  if (!actor.ok) return actor.response;

  const parsed = postMessageSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("invalid_input", "Validation failed", 422);

  const { id } = await params;
  const message = await postMessage(
    actor.actor.side,
    actor.actor.orgId,
    actor.actor.userId,
    id,
    parsed.data.body,
  );
  if (message === null) return jsonError("not_found", "Thread not found", 404);
  return NextResponse.json({ message }, { status: 201 });
}
