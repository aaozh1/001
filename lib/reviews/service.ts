import "server-only";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

// Reviews — VERIFIED PURCHASES ONLY (product invariant / handoff). A designer
// org counts as a verified purchaser of a material when one of its spec lines
// confirmed that material AND the line's RFQ closed with a winning quote.

export interface ReviewView {
  id: string;
  role: string;
  stars: number;
  body: string | null;
  createdAt: Date;
}

export async function listMaterialReviews(materialId: string): Promise<ReviewView[]> {
  const rows = await prisma.review.findMany({
    where: { materialId, verifiedPurchase: true },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, role: true, stars: true, bodyTh: true, createdAt: true },
  });
  return rows.map((r) => ({
    id: r.id,
    role: r.role,
    stars: r.stars,
    body: r.bodyTh,
    createdAt: r.createdAt,
  }));
}

export function averageStars(reviews: readonly { stars: number }[]): number | null {
  if (reviews.length === 0) return null;
  return Math.round((reviews.reduce((s, r) => s + r.stars, 0) / reviews.length) * 10) / 10;
}

/** Verified purchase check — see module comment. */
export async function canReviewMaterial(orgId: string, materialId: string): Promise<boolean> {
  const won = await prisma.specItem.findFirst({
    where: {
      confirmedMaterialId: materialId,
      project: { orgId },
      rfqs: { some: { status: "closed_won" } },
    },
    select: { id: true },
  });
  return won != null;
}

export type AddReviewResult =
  | { ok: true }
  | { ok: false; error: "not_verified" | "invalid" };

/** One review per user per material; re-submitting updates it. */
export async function addReview(
  userId: string,
  orgId: string,
  materialId: string,
  input: { stars: number; body: string | null },
): Promise<AddReviewResult> {
  if (!Number.isInteger(input.stars) || input.stars < 1 || input.stars > 5) {
    return { ok: false, error: "invalid" };
  }
  const verified = await canReviewMaterial(orgId, materialId);
  if (!verified) return { ok: false, error: "not_verified" };

  await prisma.$transaction(async (tx) => {
    const existing = await tx.review.findFirst({
      where: { materialId, userId },
      select: { id: true },
    });
    if (existing) {
      await tx.review.update({
        where: { id: existing.id },
        data: { stars: input.stars, bodyTh: input.body, verifiedPurchase: true },
      });
    } else {
      await tx.review.create({
        data: {
          materialId,
          userId,
          role: "designer",
          stars: input.stars,
          bodyTh: input.body,
          verifiedPurchase: true,
        },
      });
    }
    await writeAudit(tx, {
      orgId,
      userId,
      entityType: "review",
      entityId: materialId,
      action: existing ? "update" : "create",
      diff: { stars: input.stars },
    });
  });
  return { ok: true };
}
