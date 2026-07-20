import "server-only";
import { auth } from "@/auth";
import { jsonError } from "@/lib/http";
import { getDesignerContext } from "@/lib/projects/service";
import { getSellerContext } from "@/lib/seller/context";
import type { ChatSide } from "./logic";

export interface ChatActor {
  side: ChatSide;
  orgId: string;
  userId: string;
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
    return { ok: true, actor: { side: "designer", orgId: designer.orgId, userId: session.user.id } };
  }
  const seller = await getSellerContext(session.user.id);
  if (seller) {
    return { ok: true, actor: { side: "seller", orgId: seller.orgId, userId: session.user.id } };
  }
  return { ok: false, response: jsonError("forbidden", "No workspace", 403) };
}
