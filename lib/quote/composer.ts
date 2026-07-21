// 5H quote composer math — pure + unit-tested.
//
// The composer shows the seller what the designer will actually see: the line
// total for THIS RFQ's quantity, and how the offered unit price compares to
// the material's list price. Nothing here affects ranking — it's decision
// support for the seller only (neutrality, rule #1).

export interface QuoteSummaryInput {
  /** RFQ quantity (from the spec line). */
  qty: number | null;
  /** Unit price the seller is typing. */
  unitPrice: number | null;
  /** The material's published list price (base row of the tier table). */
  listPrice: number | null;
}

export interface QuoteSummary {
  /** qty × unitPrice, when both are known and positive. */
  lineTotal: number | null;
  /**
   * % vs list price, rounded. Negative = cheaper than list (the mock's "−4%").
   * null when either price is missing/non-positive.
   */
  discountPct: number | null;
}

function pos(n: number | null): n is number {
  return n != null && Number.isFinite(n) && n > 0;
}

export function computeQuoteSummary(input: QuoteSummaryInput): QuoteSummary {
  const lineTotal = pos(input.qty) && pos(input.unitPrice) ? input.qty * input.unitPrice : null;
  const discountPct =
    pos(input.unitPrice) && pos(input.listPrice)
      ? Math.round((input.unitPrice / input.listPrice - 1) * 100)
      : null;
  return { lineTotal, discountPct };
}

/** ฿1,234,567.5 style — mono display in the composer. */
export function formatBaht(n: number): string {
  return `฿${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}
