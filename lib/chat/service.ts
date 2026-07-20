import "server-only";
import { prisma } from "@/lib/db";
import { notifyOrg } from "@/lib/notifications/service";
import { EVENTS } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import {
  type ChatSide,
  type DesignerThreadRecord,
  type MessageView,
  type SellerThreadContext,
  normalizeBody,
  senderSideFor,
  toMessageViews,
  toSellerThreadContext,
} from "./logic";

// Chat is 2-sided and project-bound. Access is strictly by org: a designer may
// only touch threads whose designerOrgId is theirs; a seller only threads whose
// sellerOrgId is theirs. Everything a seller receives goes through the privacy
// projection in ./logic (iron rule #4 — no designer contact).

/**
 * Find the (designer, seller, project) thread or create it. Designer-initiated:
 * the designer must own the project. Returns null if the project isn't theirs.
 */
export async function getOrCreateThread(
  ctx: { orgId: string },
  key: { sellerOrgId: string; projectId: string },
): Promise<string | null> {
  const project = await prisma.project.findFirst({
    where: { id: key.projectId, orgId: ctx.orgId },
    select: { id: true },
  });
  if (!project) return null;

  const seller = await prisma.organization.findFirst({
    where: { id: key.sellerOrgId, type: "seller" },
    select: { id: true },
  });
  if (!seller) return null;

  const existing = await prisma.chatThread.findFirst({
    where: {
      designerOrgId: ctx.orgId,
      sellerOrgId: key.sellerOrgId,
      projectId: key.projectId,
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.chatThread.create({
    data: {
      designerOrgId: ctx.orgId,
      sellerOrgId: key.sellerOrgId,
      projectId: key.projectId,
    },
    select: { id: true },
  });
  await track(EVENTS.chatOpened, { orgId: ctx.orgId });
  return created.id;
}

// Load a thread the given side is allowed to see, or null.
async function loadAuthorizedThread(side: ChatSide, orgId: string, threadId: string) {
  return prisma.chatThread.findFirst({
    where: {
      id: threadId,
      ...(side === "designer" ? { designerOrgId: orgId } : { sellerOrgId: orgId }),
    },
    select: {
      id: true,
      designerOrgId: true,
      sellerOrgId: true,
      projectId: true,
      project: {
        select: {
          id: true,
          name: true,
          buildingType: true,
          _count: { select: { specItems: true } },
        },
      },
      designerOrg: { select: { name: true } },
    },
  });
}

export interface ThreadHeader {
  threadId: string;
  projectId: string | null;
  projectName: string | null;
  buildingType: string | null;
  specItemCount: number;
  /** Only populated for the designer side (the seller they're talking to). */
  sellerName?: string | null;
}

/** Header a DESIGNER sees: full project context + the seller org they chat with. */
export async function getDesignerThreadHeader(
  orgId: string,
  threadId: string,
): Promise<ThreadHeader | null> {
  const thread = await prisma.chatThread.findFirst({
    where: { id: threadId, designerOrgId: orgId },
    select: {
      id: true,
      projectId: true,
      project: {
        select: { name: true, buildingType: true, _count: { select: { specItems: true } } },
      },
      sellerOrg: { select: { name: true } },
    },
  });
  if (!thread) return null;
  return {
    threadId: thread.id,
    projectId: thread.projectId,
    projectName: thread.project?.name ?? null,
    buildingType: thread.project?.buildingType ?? null,
    specItemCount: thread.project?._count.specItems ?? 0,
    sellerName: thread.sellerOrg?.name ?? null,
  };
}

/** Context a SELLER sees: spec context only — never the designer's identity. */
export async function getSellerThreadContext(
  orgId: string,
  threadId: string,
): Promise<SellerThreadContext | null> {
  const thread = await loadAuthorizedThread("seller", orgId, threadId);
  if (!thread) return null;
  const record: DesignerThreadRecord = {
    threadId: thread.id,
    projectId: thread.projectId,
    projectName: thread.project?.name ?? null,
    buildingType: thread.project?.buildingType ?? null,
    specItemCount: thread.project?._count.specItems ?? 0,
    lastMessageAt: null,
    designerOrgId: thread.designerOrgId,
    designerName: thread.designerOrg?.name ?? null,
    designerPhone: null,
    designerEmail: null,
  };
  return toSellerThreadContext(record);
}

/** Messages for a thread, projected for the viewer. Null if no access. */
export async function listMessages(
  side: ChatSide,
  orgId: string,
  threadId: string,
): Promise<MessageView[] | null> {
  const thread = await loadAuthorizedThread(side, orgId, threadId);
  if (!thread) return null;

  const rows = await prisma.chatMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      body: true,
      createdAt: true,
      senderSide: true,
      sender: { select: { memberships: { select: { orgId: true } } } },
    },
  });

  // Prefer the side recorded at post time — a user may belong to BOTH of the
  // thread's orgs, so inferring from memberships after the fact is ambiguous.
  // The membership fallback only covers rows from before senderSide existed.
  const raw = rows.map((m) => {
    let senderSide: ChatSide;
    if (m.senderSide === "designer" || m.senderSide === "seller") {
      senderSide = m.senderSide;
    } else {
      const senderOrgIds = m.sender?.memberships.map((x) => x.orgId) ?? [];
      senderSide = senderOrgIds.includes(thread.sellerOrgId)
        ? senderSideFor(thread.sellerOrgId, thread)
        : senderSideFor(thread.designerOrgId, thread);
    }
    return { id: m.id, body: m.body, createdAt: m.createdAt, senderSide };
  });
  return toMessageViews(raw, side);
}

/** Post a message. Returns the created view, or null if the side has no access. */
export async function postMessage(
  side: ChatSide,
  orgId: string,
  userId: string,
  threadId: string,
  rawBody: string,
): Promise<MessageView | null> {
  const thread = await loadAuthorizedThread(side, orgId, threadId);
  if (!thread) return null;

  const body = normalizeBody(rawBody);
  if (!body) return null;

  const created = await prisma.chatMessage.create({
    data: { threadId, senderUserId: userId, senderSide: side, body },
    select: { id: true, body: true, createdAt: true },
  });
  // แจ้งอีกฝั่งของเธรด (ผู้ส่งไม่ต้องเห็นแจ้งเตือนของตัวเอง)
  const otherOrg = side === "designer" ? thread.sellerOrgId : thread.designerOrgId;
  const otherSide = side === "designer" ? "seller" : "designer";
  await notifyOrg(
    otherOrg,
    {
      type: "chat_new",
      payload: { project: thread.project?.name ?? "" },
      href: `/${otherSide}/chat/${threadId}`,
    },
    userId,
  );
  return toMessageViews(
    [{ id: created.id, body: created.body, createdAt: created.createdAt, senderSide: side }],
    side,
  )[0];
}

// ── Thread lists (inbox) ───────────────────────────────────────────────

export async function listDesignerThreads(orgId: string): Promise<ThreadHeader[]> {
  const threads = await prisma.chatThread.findMany({
    where: { designerOrgId: orgId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      projectId: true,
      project: {
        select: { name: true, buildingType: true, _count: { select: { specItems: true } } },
      },
      sellerOrg: { select: { name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
  });
  return threads.map((t) => ({
    threadId: t.id,
    projectId: t.projectId,
    projectName: t.project?.name ?? null,
    buildingType: t.project?.buildingType ?? null,
    specItemCount: t.project?._count.specItems ?? 0,
    sellerName: t.sellerOrg?.name ?? null,
  }));
}

export async function listSellerThreads(orgId: string): Promise<SellerThreadContext[]> {
  const threads = await prisma.chatThread.findMany({
    where: { sellerOrgId: orgId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      projectId: true,
      designerOrgId: true,
      project: {
        select: { name: true, buildingType: true, _count: { select: { specItems: true } } },
      },
      designerOrg: { select: { name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
  });
  // Each thread passes through the privacy projection — no designer identity.
  return threads.map((t) =>
    toSellerThreadContext({
      threadId: t.id,
      projectId: t.projectId,
      projectName: t.project?.name ?? null,
      buildingType: t.project?.buildingType ?? null,
      specItemCount: t.project?._count.specItems ?? 0,
      lastMessageAt: t.messages[0]?.createdAt.toISOString() ?? null,
      designerOrgId: t.designerOrgId,
      designerName: t.designerOrg?.name ?? null,
      designerPhone: null,
      designerEmail: null,
    }),
  );
}
