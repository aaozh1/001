// 5I demand insights — pure + unit-tested.
//
// IRON RULE #3 (CLAUDE.md): sellers only ever see AGGREGATE demand — counts,
// shares and trends across ALL designers. Nothing in this module accepts or
// returns a designer org, office, project or user identity, so per-office data
// physically cannot leak into the page.

export interface InsightsInput {
  /** catalog searches touching the seller's categories, this month. */
  searchesThisMonth: number;
  /** same, previous month (trend base). */
  searchesLastMonth: number;
  /** RFQs created this month in the seller's categories (all sellers). */
  rfqTotal: number;
  /** of those, how many THIS seller quoted. */
  rfqQuoted: number;
  /** filter-key usage counts within those searches (e.g. cert, priceMax). */
  filterCounts: readonly { key: string; count: number }[];
  /** the seller's own materials — for the data-gap nudge. */
  materials: readonly {
    id: string;
    name: string;
    missing: readonly string[];
  }[];
}

export interface DemandInsights {
  /** % change in searches vs last month; null when last month had none. */
  trendPct: number | null;
  rfqTotal: number;
  rfqQuoted: number;
  /** top 5 filter keys by usage, as share (%) of this month's searches. */
  bars: { key: string; sharePct: number }[];
  /** the single most-used filter (bars[0]), for the stat card. */
  topFilter: { key: string; sharePct: number } | null;
  /**
   * Data-gap nudge: a material of the seller's that is missing the field
   * designers filter by the most. null when everything is complete (or no
   * filter data yet).
   */
  gap: { materialId: string; name: string; filterKey: string; sharePct: number } | null;
}

// Which material field satisfies which catalog filter. Filters without a
// per-material field (e.g. verifiedOnly — an org property) can't produce a
// material-level nudge.
const FILTER_FIELD: Record<string, string> = {
  cert: "cert",
  priceMin: "price",
  priceMax: "price",
};

export function computeDemandInsights(input: InsightsInput): DemandInsights {
  const trendPct =
    input.searchesLastMonth > 0
      ? Math.round(
          ((input.searchesThisMonth - input.searchesLastMonth) / input.searchesLastMonth) * 100,
        )
      : null;

  const bars = [...input.filterCounts]
    .filter((f) => f.count > 0)
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, 5)
    .map((f) => ({
      key: f.key,
      sharePct:
        input.searchesThisMonth > 0
          ? Math.min(100, Math.round((f.count / input.searchesThisMonth) * 100))
          : 0,
    }));

  // Nudge on the heaviest filter that maps to a material field AND that at
  // least one of the seller's materials is missing.
  let gap: DemandInsights["gap"] = null;
  for (const bar of bars) {
    const field = FILTER_FIELD[bar.key];
    if (!field) continue;
    const hit = input.materials.find((m) => m.missing.includes(field));
    if (hit) {
      gap = { materialId: hit.id, name: hit.name, filterKey: bar.key, sharePct: bar.sharePct };
      break;
    }
  }

  return {
    trendPct,
    rfqTotal: input.rfqTotal,
    rfqQuoted: input.rfqQuoted,
    bars,
    topFilter: bars[0] ?? null,
    gap,
  };
}
