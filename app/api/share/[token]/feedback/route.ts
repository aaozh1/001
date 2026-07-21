import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson, tooManyRequests, clientIp } from "@/lib/http";
import { consume } from "@/lib/rate-limit";
import { addShareFeedback, getSharedSpecBook } from "@/lib/spec-book/service";
import { notifyOrg } from "@/lib/notifications/service";

const schema = z.object({
  itemCode: z.string().trim().min(1).max(40),
  guestName: z.string().trim().min(1).max(60),
  kind: z.enum(["approve", "comment"]),
  comment: z.string().trim().max(500).optional(),
});

// POST /api/share/:token/feedback — guest approval/comment on a shared Spec
// Book (5F). Public by design (the link IS the credential); rate-limited per
// IP, and the owning designer org gets a notification.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const rl = consume(`shareFb:${clientIp(request)}`, { limit: 20, windowMs: 10 * 60_000 });
  if (!rl.allowed) return tooManyRequests(rl.retryAfterSec);

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("invalid_input", "Validation failed", 422);
  if (parsed.data.kind === "comment" && !parsed.data.comment) {
    return jsonError("invalid_input", "Comment required", 422);
  }

  const book = await getSharedSpecBook(token);
  if (!book) return jsonError("not_found", "Link expired or revoked", 404);

  const ok = await addShareFeedback(token, parsed.data);
  if (!ok) return jsonError("not_found", "Link expired or revoked", 404);

  await notifyOrg(book.project.orgId, {
    type: "share_feedback",
    payload: {
      project: book.project.name,
      code: parsed.data.itemCode,
      guest: parsed.data.guestName,
      kind: parsed.data.kind,
    },
    href: `/s/${token}`,
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
