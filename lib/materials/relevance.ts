// Neutral spec-relevance ranking for the catalog (CLAUDE.md rule #1: results
// are ordered ONLY by how well they match the query + data completeness — never
// by any paid signal). Pure + unit-tested.
//
// This is the ONE place ranking is decided; keep it free of any seller/payment
// input so neutrality can't regress.

export interface RankableMaterial {
  nameTh: string;
  nameEn?: string | null;
  brand?: string | null;
  model?: string | null;
  sku?: string | null;
  completeness: number; // 0-100 data richness (not a paid boost)
}

// How strongly a match in each field counts toward relevance.
const FIELD_WEIGHT = { sku: 5, model: 4, name: 4, brand: 3 } as const;

// exact = full weight, prefix = 0.6, substring = 0.35.
function fieldScore(value: string | null | undefined, q: string): number {
  if (!value) return 0;
  const v = value.toLowerCase();
  if (v === q) return 1;
  if (v.startsWith(q)) return 0.6;
  if (v.includes(q)) return 0.35;
  return 0;
}

/**
 * Relevance of a material to a search query (higher = better). With no query
 * the score is 0 for everything, so the caller falls back to completeness — a
 * neutral, richness-based order. Completeness only ever breaks ties; it can
 * never outrank a real text match.
 */
export function materialRelevance(m: RankableMaterial, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const score =
    fieldScore(m.sku, q) * FIELD_WEIGHT.sku +
    fieldScore(m.model, q) * FIELD_WEIGHT.model +
    Math.max(fieldScore(m.nameTh, q), fieldScore(m.nameEn, q)) * FIELD_WEIGHT.name +
    fieldScore(m.brand, q) * FIELD_WEIGHT.brand;

  // Tie-break by completeness, scaled tiny so it never overtakes a text match.
  return score + (m.completeness / 100) * 0.001;
}

/** Sort a copy by relevance (desc), then completeness, then name — neutral. */
export function rankMaterials<T extends RankableMaterial>(
  materials: readonly T[],
  query: string,
): T[] {
  const q = query.trim();
  return [...materials].sort((a, b) => {
    if (q) {
      const d = materialRelevance(b, q) - materialRelevance(a, q);
      if (Math.abs(d) > 1e-9) return d;
    }
    if (b.completeness !== a.completeness) return b.completeness - a.completeness;
    return a.nameTh.localeCompare(b.nameTh);
  });
}
