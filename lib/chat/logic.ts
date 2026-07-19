// Chat business logic — pure + unit-tested. Chat is 2-sided and bound to a
// project, but it must honour iron rule #4: a seller sees the designer's spec
// context, NEVER their identity/contact. So message views carry only a body, a
// timestamp and which side sent it — no name, phone or email ever flows to the
// seller through chat.

export type ChatSide = "designer" | "seller";

export const MAX_MESSAGE_LEN = 2000;

export interface RawMessage {
  id: string;
  body: string;
  createdAt: Date;
  /** Resolved by the service from the sender's org relative to the thread. */
  senderSide: ChatSide;
}

export interface MessageView {
  id: string;
  body: string;
  createdAt: string;
  senderSide: ChatSide;
  /** True when the viewer's own side authored the message (right-aligned). */
  mine: boolean;
}

/**
 * Project raw messages into views for one viewer. Deliberately drops every
 * identity field — the only per-message facts either side needs are the text,
 * the time, and whether it was sent by "me" or "them".
 */
export function toMessageViews(
  messages: readonly RawMessage[],
  viewer: ChatSide,
): MessageView[] {
  return messages.map((m) => ({
    id: m.id,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
    senderSide: m.senderSide,
    mine: m.senderSide === viewer,
  }));
}

/**
 * The side a sender is on within a thread. Anyone who is not the thread's
 * seller org is treated as the designer side (threads are strictly 2-party).
 */
export function senderSideFor(
  senderOrgId: string,
  thread: { designerOrgId: string; sellerOrgId: string },
): ChatSide {
  return senderOrgId === thread.sellerOrgId ? "seller" : "designer";
}

/** Trim + length-clamp a message body; returns null when empty. */
export function normalizeBody(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_MESSAGE_LEN);
}

// ── Privacy (iron rule #4) ─────────────────────────────────────────────
// The ONLY thread-level shape a seller may receive. It mirrors the RFQ's
// seller view: project spec context, but no designer identity. A test asserts
// no contact field can leak through it.

export interface SellerThreadContext {
  threadId: string;
  projectId: string | null;
  projectName: string | null;
  buildingType: string | null;
  specItemCount: number;
  lastMessageAt: string | null;
}

export interface DesignerThreadRecord {
  threadId: string;
  projectId: string | null;
  projectName: string | null;
  buildingType: string | null;
  specItemCount: number;
  lastMessageAt: string | null;
  // designer-only fields — must never reach a seller context
  designerOrgId: string;
  designerName: string | null;
  designerPhone: string | null;
  designerEmail: string | null;
}

/** Drop every designer-identity field before a thread reaches a seller. */
export function toSellerThreadContext(r: DesignerThreadRecord): SellerThreadContext {
  return {
    threadId: r.threadId,
    projectId: r.projectId,
    projectName: r.projectName,
    buildingType: r.buildingType,
    specItemCount: r.specItemCount,
    lastMessageAt: r.lastMessageAt,
  };
}
