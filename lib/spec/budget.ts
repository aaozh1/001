// 5B budget roll-up — pure + unit-tested.
//
// The schedule footer answers "what does this project cost with the best
// offers on the table?" Best price per line = the lowest quote received,
// falling back to the material's list price. Lines without a quantity or any
// price stay out of the total (and are reported so the UI can say "of N").

export interface BudgetRowInput {
  /** Line quantity as entered (string from the table). */
  qty: string | number | null;
  /** List price of the confirmed/first option. */
  listPrice: string | number | null;
  /** Lowest quote received for the line, if any. */
  bestQuote: string | number | null;
}

export interface BudgetSummary {
  /** Σ qty × best price (quote else list). */
  bestTotal: number;
  /** Σ qty × list price over the same lines (for the savings delta). */
  listTotal: number;
  /** listTotal − bestTotal, floored at 0. */
  savings: number;
  /** Lines that carried both a qty and a price. */
  pricedLines: number;
  totalLines: number;
}

function num(v: string | number | null): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function computeBudget(rows: readonly BudgetRowInput[]): BudgetSummary {
  let bestTotal = 0;
  let listTotal = 0;
  let pricedLines = 0;

  for (const row of rows) {
    const qty = num(row.qty);
    const list = num(row.listPrice);
    const quote = num(row.bestQuote);
    const best = quote ?? list;
    if (qty == null || best == null) continue;
    pricedLines += 1;
    bestTotal += qty * best;
    // Savings compare against list only when a list price exists; otherwise
    // the line contributes equally to both sides (no phantom savings).
    listTotal += qty * (list ?? best);
  }

  return {
    bestTotal,
    listTotal,
    savings: Math.max(0, listTotal - bestTotal),
    pricedLines,
    totalLines: rows.length,
  };
}
