// Analytics vocabulary + funnel math — pure + unit-tested (Phase 4.2).
//
// Replaces the prototype's in-session metrics panel with a persistent event
// log. Funnels count DISTINCT ORGS reaching each step (an org that sent 50
// RFQs converted once), and steps are ordered — conversion is measured against
// both the first step and the previous one.

export const EVENTS = {
  // Designer funnel
  signupDesigner: "signup_designer",
  projectCreated: "project_created",
  optionAdded: "option_added",
  rfqSent: "rfq_sent",
  winnerSelected: "winner_selected",
  // Seller funnel
  signupSeller: "signup_seller",
  materialPublished: "material_published",
  quoteSubmitted: "quote_submitted",
  rfqWon: "rfq_won",
  // Supporting events (counted, not funnel steps)
  specbookCreated: "specbook_created",
  excelImported: "excel_imported",
  chatOpened: "chat_opened",
  templateSaved: "template_saved",
  templateUsed: "template_used",
  setApplied: "set_applied",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

// The two funnels the ROADMAP asks for ("track funnel ทั้ง 2 ฝั่ง").
export const DESIGNER_FUNNEL: readonly EventName[] = [
  EVENTS.signupDesigner,
  EVENTS.projectCreated,
  EVENTS.optionAdded,
  EVENTS.rfqSent,
  EVENTS.winnerSelected,
];

export const SELLER_FUNNEL: readonly EventName[] = [
  EVENTS.signupSeller,
  EVENTS.materialPublished,
  EVENTS.quoteSubmitted,
  EVENTS.rfqWon,
];

export interface FunnelStep {
  event: EventName;
  /** Distinct orgs that reached this step. */
  orgs: number;
  /** % of the funnel's first step (100 for the first). null when first = 0. */
  pctOfFirst: number | null;
  /** % of the previous step. null for the first step or when previous = 0. */
  pctOfPrev: number | null;
}

export interface EventRow {
  event: string;
  orgId: string | null;
}

/** Build a funnel from raw event rows. Pure. */
export function computeFunnel(
  rows: readonly EventRow[],
  steps: readonly EventName[],
): FunnelStep[] {
  const orgsPerEvent = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!r.orgId) continue;
    let set = orgsPerEvent.get(r.event);
    if (!set) orgsPerEvent.set(r.event, (set = new Set()));
    set.add(r.orgId);
  }

  const counts = steps.map((event) => orgsPerEvent.get(event)?.size ?? 0);
  const first = counts[0] ?? 0;

  return steps.map((event, i) => ({
    event,
    orgs: counts[i],
    pctOfFirst:
      i === 0 ? (first > 0 ? 100 : null) : first > 0 ? Math.round((counts[i] / first) * 100) : null,
    pctOfPrev:
      i === 0
        ? null
        : counts[i - 1] > 0
          ? Math.round((counts[i] / counts[i - 1]) * 100)
          : null,
  }));
}

/** Total occurrences per event name (for the "top events" table). Pure. */
export function countEvents(rows: readonly { event: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.event, (counts.get(r.event) ?? 0) + 1);
  return counts;
}
