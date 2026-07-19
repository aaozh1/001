// Quote maths + status transitions — pure, unit-tested.

/** Effective unit price after a per-project discount (never below 0). */
export function effectiveUnitPrice(pricePerUnit: number, projectDiscount: number | null): number {
  const p = pricePerUnit - (projectDiscount ?? 0);
  return p < 0 ? 0 : p;
}

/** Line total = effective unit price × quantity (0 when qty unknown). */
export function lineTotal(
  pricePerUnit: number,
  projectDiscount: number | null,
  qty: number | null,
): number {
  if (qty == null || qty <= 0) return 0;
  return effectiveUnitPrice(pricePerUnit, projectDiscount) * qty;
}

/** Is a quote still valid at `now`? (no expiry → always valid). */
export function isQuoteValid(validUntil: Date | null, now: Date): boolean {
  return validUntil == null || validUntil.getTime() >= now.getTime();
}

// An RFQ moves open → quoted the moment its first quote lands. It only leaves
// "quoted" on select (closed_won/closed_lost, Phase 2.4).
export function rfqStatusAfterQuote(current: string): string {
  return current === "open" ? "quoted" : current;
}

// ── Selection (Phase 2.4) ──────────────────────────────────────────────
// Choosing a winner sets that quote `selected` and every other `rejected`; the
// rejected sellers are thereby notified in-app (courtesy). Pure + tested.

export interface SelectionOutcome {
  selected: string;
  rejected: string[];
}

/**
 * Resolve which quotes win/lose. Returns null if the chosen id isn't among the
 * quotes (guards the endpoint against a foreign quote id).
 */
export function selectionOutcome(
  quoteIds: readonly string[],
  selectedId: string,
): SelectionOutcome | null {
  if (!quoteIds.includes(selectedId)) return null;
  return {
    selected: selectedId,
    rejected: quoteIds.filter((id) => id !== selectedId),
  };
}
