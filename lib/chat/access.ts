import "server-only";
import { auth } from "@/auth";
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
 * Resolve the calling user as a chat participant. A user may hold both roles;
 * we act on their designer workspace first, else their seller workspace. The
 * per-thread access check (org must match the thread) happens in the service.
 */
export async function resolveChatActor(): Promise<Resolved> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, response: jsonError("unauthorized", "Login required", 401) };
  }
  const designer = await getDesignerContext(session.user.id);
  if (designer) {
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
  const seller = await getSellerContext(session.user.id);
  if (seller) {
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
  return { ok: false, response: jsonError("forbidden", "No workspace", 403) };
}
