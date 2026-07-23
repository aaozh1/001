import "server-only";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { canManageProjects } from "@/lib/permissions";
import { getDesignerContext } from "@/lib/projects/service";
import { canQuote, getSellerContext } from "@/lib/seller/context";
import type { ChatSide } from "./logic";

export interface ChatActor {
  side: ChatSide;
  orgId: string;
  userId: string;
  /**
   * May this actor SEND messages (engage the other side in the org's name)?
   * Designer side: owner/editor only — a read-only viewer must not negotiate
   * with sellers. Seller side: quoting roles (owner/manager/sales).
   * Reading a thread stays open to every member of the org.
   */
  canPost: boolean;
}

type Resolved =
  | { ok: true; actor: ChatActor }
  | { ok: false; response: ReturnType<typeof jsonError> };

/**
 * Resolve the calling user as a participant of a SPECIFIC thread. A user may
 * hold BOTH roles (CLAUDE.md), so we must pick the side that matches this
 * thread — not just "designer first". We look at the thread's two orgs and
 * match against the user's designer/seller contexts; the side they belong to
 * on this thread wins. (A thread's designerOrg and sellerOrg are different
 * orgs of different types, so at most one side can match — unambiguous.)
 */
export async function resolveChatActorForThread(threadId: string): Promise<Resolved> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, response: jsonError("unauthorized", "Login required", 401) };
  }

  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    select: { designerOrgId: true, sellerOrgId: true },
  });
  // 404, not 403 — don't reveal whether a thread exists to non-participants.
  if (!thread) return { ok: false, response: jsonError("not_found", "Thread not found", 404) };

  const [designer, seller] = await Promise.all([
    getDesignerContext(session.user.id),
    getSellerContext(session.user.id),
  ]);

  if (designer && designer.orgId === thread.designerOrgId) {
    return {
      ok: true,
      actor: {
        side: "designer",
        orgId: designer.orgId,
        userId: session.user.id,
        canPost: canManageProjects(designer.role),
      },
    };
  }
  if (seller && seller.orgId === thread.sellerOrgId) {
    return {
      ok: true,
      actor: {
        side: "seller",
        orgId: seller.orgId,
        userId: session.user.id,
        canPost: canQuote(seller.role),
      },
    };
  }
  return { ok: false, response: jsonError("not_found", "Thread not found", 404) };
}
