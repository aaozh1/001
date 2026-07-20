// Seller RFQ inbox tabs — pure + unit-tested (ROADMAP 3.3).
//
// The inbox answers one question per tab:
//   awaiting  — leads still waiting on MY quote (the money tab, SLA ticking)
//   answered  — I quoted, designer hasn't decided
//   won/lost  — decided outcomes
// "awaiting" only counts LIVE RFQs: a closed/expired RFQ nobody answered is
// not actionable and must not inflate the to-do count.

export type InboxTab = "all" | "awaiting" | "answered" | "won" | "lost";

export const INBOX_TABS: readonly InboxTab[] = [
  "all",
  "awaiting",
  "answered",
  "won",
  "lost",
];

export interface TabbableRfq {
  status: string; // RFQ: open | quoted | closed_won | closed_lost | expired
  responded: boolean; // this seller answered
  quoteStatus: string | null; // this seller's quote: submitted | selected | rejected
}

export function tabOf(rfq: TabbableRfq): Exclude<InboxTab, "all"> | "other" {
  if (rfq.quoteStatus === "selected") return "won";
  if (rfq.quoteStatus === "rejected") return "lost";
  if (rfq.responded) return "answered";
  if (rfq.status === "open" || rfq.status === "quoted") return "awaiting";
  // Unanswered but the RFQ is already closed/expired — nothing to do.
  return "other";
}

export function matchesTab(rfq: TabbableRfq, tab: InboxTab): boolean {
  if (tab === "all") return true;
  return tabOf(rfq) === tab;
}

export function countByTab<T extends TabbableRfq>(
  rfqs: readonly T[],
): Record<InboxTab, number> {
  const counts: Record<InboxTab, number> = {
    all: rfqs.length,
    awaiting: 0,
    answered: 0,
    won: 0,
    lost: 0,
  };
  for (const r of rfqs) {
    const tab = tabOf(r);
    if (tab !== "other") counts[tab] += 1;
  }
  return counts;
}

// ── SLA countdown ──────────────────────────────────────────────────────

export type SlaRemaining =
  | { state: "none" }
  | { state: "overdue"; hours: number }
  | { state: "due"; hours: number; minutes: number };

/** Time left until an SLA deadline, floored to whole minutes. Pure. */
export function slaRemaining(slaDueAt: string | null, nowMs: number): SlaRemaining {
  if (!slaDueAt) return { state: "none" };
  const due = new Date(slaDueAt).getTime();
  if (Number.isNaN(due)) return { state: "none" };
  const diff = due - nowMs;
  if (diff <= 0) {
    return { state: "overdue", hours: Math.floor(-diff / 3_600_000) };
  }
  const totalMinutes = Math.floor(diff / 60_000);
  return {
    state: "due",
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
}
