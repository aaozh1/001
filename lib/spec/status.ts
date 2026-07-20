// Derived SpecItem status — DATA_MODEL says status is COMPUTED, not stored
// (empty | options | chosen | sent | quoted). This module owns that derivation
// and the mapping to a StatusChip visual variant. Pure + unit-tested; the full
// SpecItem CRUD arrives in Phase 1, but the status vocabulary + styling belong
// to the design system (task 0.4).

export const SPEC_STATUSES = [
  "empty",
  "options",
  "chosen",
  "sent",
  "quoted",
] as const;

export type SpecStatus = (typeof SPEC_STATUSES)[number];

// Visual variant each status maps to (colors defined in the design tokens).
export type BadgeVariant = "neutral" | "warn" | "ok" | "info" | "quoted";

const STATUS_VARIANT: Record<SpecStatus, BadgeVariant> = {
  empty: "neutral",
  options: "warn",
  chosen: "ok",
  sent: "info",
  quoted: "quoted",
};

export function statusVariant(status: SpecStatus): BadgeVariant {
  return STATUS_VARIANT[status];
}

/**
 * Derive a spec line's status from its data. Mirrors the prototype's `statusOf`:
 * an RFQ that's been sent/quoted wins; otherwise a confirmed material → chosen,
 * any options → options, nothing → empty.
 */
export function deriveSpecStatus(item: {
  hasSentRfq?: boolean;
  hasQuote?: boolean;
  confirmedMaterialId?: string | null;
  optionCount?: number;
}): SpecStatus {
  if (item.hasQuote) return "quoted";
  if (item.hasSentRfq) return "sent";
  if (item.confirmedMaterialId) return "chosen";
  if ((item.optionCount ?? 0) > 0) return "options";
  return "empty";
}

/**
 * Map a line's RFQ pipeline state to the flags deriveSpecStatus expects.
 * A "closed" RFQ (winner chosen) is deliberately NOT "sent": the deal is
 * done, so the line's status must come from its confirmed material — without
 * this rule a won line showed "awaiting quotes" forever. Kept pure + tested
 * so every caller applies the same rule.
 */
export function rfqFlags(state: "sent" | "quoted" | "closed" | undefined): {
  hasSentRfq: boolean;
  hasQuote: boolean;
} {
  return {
    hasSentRfq: state === "sent" || state === "quoted",
    hasQuote: state === "quoted",
  };
}
