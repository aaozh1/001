// VE Finder — pure scoring (unit-tested). Given a CONFIRMED material, rank
// cheaper same-category alternatives by SPEC SIMILARITY, then savings.
//
// NEUTRALITY (rule #1): similarity is computed only from product data (specs,
// facts) — no seller identity, no payment, no boost can enter this ranking.

export interface VeCandidateInput {
  id: string;
  price: number;
  unit: string | null;
  specText: string | null;
  cert: string | null;
  warranty: string | null;
  leadTime: string | null;
  size: string | null;
  completeness: number;
}

export interface VeBase {
  price: number;
  unit: string | null;
  specText: string | null;
  cert: string | null;
  warranty: string | null;
  leadTime: string | null;
  size: string | null;
}

export interface VeScored {
  id: string;
  savingPercent: number;
  similarity: number; // 0..1
}

/** Tokenise a spec summary for overlap comparison (TH/EN, numbers kept). */
export function specTokens(text: string | null): Set<string> {
  if (!text) return new Set();
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9ก-๙.%]+/i)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter || 1);
}

/** Spec similarity between the confirmed material and a candidate (0..1). */
export function veSimilarity(base: VeBase, cand: VeCandidateInput): number {
  let score = jaccard(specTokens(base.specText), specTokens(cand.specText)) * 0.6;
  if (base.cert && cand.cert && base.cert === cand.cert) score += 0.15;
  if (base.unit && cand.unit && base.unit === cand.unit) score += 0.1;
  if (base.warranty && cand.warranty && base.warranty === cand.warranty) score += 0.075;
  if (base.size && cand.size && base.size === cand.size) score += 0.075;
  return Math.min(1, score);
}

export function savingPercent(basePrice: number, candPrice: number): number {
  if (basePrice <= 0) return 0;
  return Math.round(((basePrice - candPrice) / basePrice) * 1000) / 10;
}

/**
 * Rank cheaper alternatives: similarity first (spec relevance), savings as the
 * tie-breaker band. Only candidates priced BELOW the base and with the same
 * unit (ราคาต่อหน่วยต้องเทียบกันได้จริง) qualify.
 */
export function rankVeCandidates(
  base: VeBase,
  candidates: readonly VeCandidateInput[],
  limit = 5,
): VeScored[] {
  return candidates
    .filter(
      (c) =>
        c.price > 0 &&
        c.price < base.price &&
        (base.unit == null || c.unit == null || c.unit === base.unit),
    )
    .map((c) => ({
      id: c.id,
      savingPercent: savingPercent(base.price, c.price),
      similarity: veSimilarity(base, c),
      completeness: c.completeness,
    }))
    .sort(
      (a, b) =>
        b.similarity - a.similarity ||
        b.savingPercent - a.savingPercent ||
        b.completeness - a.completeness,
    )
    .slice(0, limit)
    .map(({ id, savingPercent: sp, similarity }) => ({ id, savingPercent: sp, similarity }));
}

/** Project-level savings if the given per-line swaps were taken. */
export function projectSavings(
  lines: readonly { qty: number | null; basePrice: number; candPrice: number }[],
): number {
  return lines.reduce((sum, l) => {
    const per = l.basePrice - l.candPrice;
    if (per <= 0) return sum;
    return sum + per * (l.qty ?? 1);
  }, 0);
}
