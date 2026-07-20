import "server-only";
import { prisma } from "@/lib/db";
import {
  type PerformanceStats,
  type RecipientStat,
  computePerformance,
} from "./performance";

// Loads one seller's performance + the platform-wide aggregate for comparison.
// Rule #3: the comparison row is computed across ALL sellers at once — no other
// org's individual numbers ever leave the database.

export interface PerformanceReport {
  own: PerformanceStats;
  platform: PerformanceStats;
}

export async function getPerformanceReport(orgId: string): Promise<PerformanceReport> {
  const [recipients, quotes] = await Promise.all([
    prisma.rFQRecipient.findMany({
      select: {
        rfqId: true,
        sellerOrgId: true,
        respondedAt: true,
        rfq: { select: { createdAt: true } },
      },
    }),
    prisma.quote.findMany({ select: { rfqId: true, sellerOrgId: true, status: true } }),
  ]);

  const quoteStatus = new Map<string, string>();
  for (const q of quotes) quoteStatus.set(`${q.rfqId}:${q.sellerOrgId}`, q.status);

  // One lead per (rfq, seller): a seller with two materials on one RFQ still
  // answered ONE lead. Prefer the answered row when deduping.
  const dedup = new Map<string, (typeof recipients)[number]>();
  for (const r of recipients) {
    const key = `${r.rfqId}:${r.sellerOrgId}`;
    const existing = dedup.get(key);
    if (!existing || (existing.respondedAt === null && r.respondedAt !== null)) {
      dedup.set(key, r);
    }
  }

  const toStat = (r: (typeof recipients)[number]): RecipientStat => ({
    sentAt: r.rfq.createdAt,
    respondedAt: r.respondedAt,
    quoteStatus: quoteStatus.get(`${r.rfqId}:${r.sellerOrgId}`) ?? null,
  });

  const rows = [...dedup.values()];
  const ownRows = rows.filter((r) => r.sellerOrgId === orgId);

  return {
    own: computePerformance(ownRows.map(toStat)),
    platform: computePerformance(rows.map(toStat)),
  };
}
