// Seller performance metrics — pure + unit-tested (ROADMAP 3.4).
//
// The prototype's performance card shows the seller's own numbers next to the
// platform average. Iron rule #3: only AGGREGATE data may ever be shown across
// orgs — these helpers compute one org's stats from its own rows, and the
// service feeds the comparison from an all-sellers aggregate, never another
// office's individual numbers.

export interface RecipientStat {
  /** When the RFQ reached this seller. */
  sentAt: Date;
  /** When this seller answered (null = not yet). */
  respondedAt: Date | null;
  /** This seller's quote outcome, if any: submitted | selected | rejected. */
  quoteStatus: string | null;
}

export interface PerformanceStats {
  received: number;
  answered: number;
  /** 0–100 (%). null when nothing received yet. */
  responseRate: number | null;
  /** Mean hours from received → answered. null when nothing answered yet. */
  avgResponseHours: number | null;
  quotesDecided: number;
  won: number;
  /** 0–100 (%) of decided quotes won. null when nothing decided yet. */
  winRate: number | null;
}

export function computePerformance(rows: readonly RecipientStat[]): PerformanceStats {
  const received = rows.length;
  const answeredRows = rows.filter((r) => r.respondedAt !== null);
  const answered = answeredRows.length;

  let avgResponseHours: number | null = null;
  if (answered > 0) {
    const totalMs = answeredRows.reduce(
      (sum, r) => sum + Math.max(0, r.respondedAt!.getTime() - r.sentAt.getTime()),
      0,
    );
    avgResponseHours = Math.round((totalMs / answered / 3_600_000) * 10) / 10;
  }

  const decidedRows = rows.filter(
    (r) => r.quoteStatus === "selected" || r.quoteStatus === "rejected",
  );
  const won = decidedRows.filter((r) => r.quoteStatus === "selected").length;

  return {
    received,
    answered,
    responseRate: received > 0 ? Math.round((answered / received) * 100) : null,
    avgResponseHours,
    quotesDecided: decidedRows.length,
    won,
    winRate:
      decidedRows.length > 0 ? Math.round((won / decidedRows.length) * 100) : null,
  };
}
