import "server-only";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { canManageMaterials, canQuote } from "@/lib/permissions";

// Pure role rules live in lib/permissions (unit-tested there); re-export for
// existing callers.
export { canManageMaterials, canQuote };

// Seller-side counterpart to the designer context/guard. A user may belong to
// several seller companies; we act as their first seller membership.
export interface SellerContext {
  userId: string;
  orgId: string;
  role: string;
}

export async function getSellerContext(userId: string): Promise<SellerContext | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId, org: { type: "seller" } },
    include: { org: { select: { createdAt: true } } },
    orderBy: { org: { createdAt: "asc" } },
  });
  if (!membership) return null;
  return { userId, orgId: membership.orgId, role: membership.role };
}

type GuardResult =
  | { ok: true; ctx: SellerContext }
  | { ok: false; response: ReturnType<typeof jsonError> };

export async function requireSeller(
  opts: { quote?: boolean } = {},
): Promise<GuardResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, response: jsonError("unauthorized", "Login required", 401) };
  }
  const ctx = await getSellerContext(session.user.id);
  if (!ctx) {
    return { ok: false, response: jsonError("forbidden", "No seller workspace", 403) };
  }
  if (opts.quote && !canQuote(ctx.role)) {
    return { ok: false, response: jsonError("forbidden", "Insufficient role", 403) };
  }
  return { ok: true, ctx };
}
