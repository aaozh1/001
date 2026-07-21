"use server";

import { managerContextOrThrow } from "@/lib/projects/manager-context";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { consume } from "@/lib/rate-limit";
import { notifyOrg } from "@/lib/notifications/service";

export type NudgeResult = { ok: boolean; error?: "not_found" | "rate_limited" };

// 5D "nudge": remind a seller who has not quoted yet. Capped to 2 per
// rfq+seller per 24 h so it never becomes spam.
export async function nudgeSellerAction(
  projectId: string,
  rfqId: string,
  sellerOrgId: string,
): Promise<NudgeResult> {
  const ctx = await managerContextOrThrow();

  const rfq = await prisma.rFQ.findFirst({
    where: {
      id: rfqId,
      project: { id: projectId, orgId: ctx.orgId },
      recipients: { some: { sellerOrgId, respondedAt: null } },
      status: "open",
    },
    select: { id: true, specItem: { select: { code: true, project: { select: { name: true } } } } },
  });
  if (!rfq) return { ok: false, error: "not_found" };

  const rl = consume(`nudge:${rfqId}:${sellerOrgId}`, { limit: 2, windowMs: 24 * 3_600_000 });
  if (!rl.allowed) return { ok: false, error: "rate_limited" };

  await notifyOrg(sellerOrgId, {
    type: "rfq_new",
    payload: { count: 1, nudge: 1, code: rfq.specItem.code, project: rfq.specItem.project.name },
    href: "/seller/rfq",
  });
  await writeAudit(prisma, {
    orgId: ctx.orgId,
    userId: ctx.userId,
    entityType: "rfq",
    entityId: rfqId,
    action: "nudge",
    diff: { sellerOrgId },
  });
  return { ok: true };
}
