import "server-only";
import { prisma } from "@/lib/db";
import { EVENTS } from "@/lib/analytics/events";
import { computeDemandInsights, type DemandInsights } from "./insights";

// 5I demand insights — DB reads for the seller insights page.
//
// IRON RULE #3: everything handed to the page is an AGGREGATE (counts and
// shares across ALL designers). RFQ/search rows are counted, never listed;
// no designer org, project or user identity leaves this module.

export interface SellerInsights extends DemandInsights {
  /** Which material families the numbers cover (the seller's own categories). */
  categories: string[];
}

const SEARCH_ROW_CAP = 20_000;

function monthStart(d: Date, monthsBack: number): Date {
  return new Date(d.getFullYear(), d.getMonth() - monthsBack, 1);
}

export async function getSellerInsights(
  sellerOrgId: string,
  now = new Date(),
): Promise<SellerInsights> {
  // The seller's material families scope every aggregate below.
  const cats = await prisma.material.groupBy({
    by: ["category"],
    where: { sellerOrgId },
  });
  const categories = cats.map((c) => c.category).filter(Boolean);
  const catSet = new Set(categories);

  const thisStart = monthStart(now, 0);
  const lastStart = monthStart(now, 1);

  const [searchRows, rfqTotal, rfqQuoted, materials] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where: { event: EVENTS.catalogSearched, createdAt: { gte: lastStart } },
      select: { createdAt: true, props: true },
      take: SEARCH_ROW_CAP,
      orderBy: { createdAt: "desc" },
    }),
    prisma.rFQ.count({
      where: {
        createdAt: { gte: thisStart },
        specItem: { category: { in: categories.length ? categories : ["__none__"] } },
      },
    }),
    prisma.rFQ.count({
      where: {
        createdAt: { gte: thisStart },
        specItem: { category: { in: categories.length ? categories : ["__none__"] } },
        quotes: { some: { sellerOrgId } },
      },
    }),
    prisma.material.findMany({
      where: { sellerOrgId },
      select: { id: true, nameTh: true, price: true, cert: true },
      orderBy: { completeness: "asc" },
      take: 200,
    }),
  ]);

  // Category-scoped search rows, split into this month vs last month; filter
  // KIND usage counted for this month only.
  let searchesThisMonth = 0;
  let searchesLastMonth = 0;
  const filterUse = new Map<string, number>();
  for (const row of searchRows) {
    const p = row.props as { category?: string | null; filters?: unknown } | null;
    const cat = p?.category ?? null;
    // Un-categorised searches still count when the seller has materials at all
    // (a global search reaches every family).
    if (cat != null && !catSet.has(cat)) continue;
    if (catSet.size === 0) continue;
    if (row.createdAt >= thisStart) {
      searchesThisMonth += 1;
      if (Array.isArray(p?.filters)) {
        for (const key of p.filters) {
          if (typeof key === "string") filterUse.set(key, (filterUse.get(key) ?? 0) + 1);
        }
      }
    } else {
      searchesLastMonth += 1;
    }
  }

  const insights = computeDemandInsights({
    searchesThisMonth,
    searchesLastMonth,
    rfqTotal,
    rfqQuoted,
    filterCounts: [...filterUse.entries()].map(([key, count]) => ({ key, count })),
    materials: materials.map((m) => ({
      id: m.id,
      name: m.nameTh,
      missing: [
        ...(m.price == null ? ["price"] : []),
        ...(m.cert == null || m.cert.trim() === "" ? ["cert"] : []),
      ],
    })),
  });

  return { ...insights, categories };
}
