// Sliding-window rate limiter — pure core + a process-local store (Phase 4.3).
//
// Self-host, single-instance deployment (ARCHITECTURE): an in-memory store is
// the honest choice — no external dependency to pick. If MatList ever runs
// multiple instances, swap the store for a shared one (Redis et al.) behind
// the same `consume` signature; limits and call sites stay put.

export interface RateLimitRule {
  /** Max requests allowed inside the window. */
  limit: number;
  windowMs: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  /** Seconds until the oldest hit leaves the window (when blocked). */
  retryAfterSec: number;
}

/**
 * Pure sliding-window decision: given the timestamps of previous hits, decide
 * whether one more at `nowMs` is allowed, and which timestamps remain relevant.
 */
export function slideWindow(
  hits: readonly number[],
  nowMs: number,
  rule: RateLimitRule,
): { decision: RateLimitDecision; hits: number[] } {
  const cutoff = nowMs - rule.windowMs;
  const live = hits.filter((t) => t > cutoff);

  if (live.length >= rule.limit) {
    const oldest = Math.min(...live);
    return {
      decision: {
        allowed: false,
        remaining: 0,
        retryAfterSec: Math.max(1, Math.ceil((oldest + rule.windowMs - nowMs) / 1000)),
      },
      hits: live,
    };
  }
  live.push(nowMs);
  return {
    decision: {
      allowed: true,
      remaining: rule.limit - live.length,
      retryAfterSec: 0,
    },
    hits: live,
  };
}

// ── Process-local store ────────────────────────────────────────────────

const store = new Map<string, number[]>();
let lastSweep = 0;

/** Consume one request for `key` under `rule`. */
export function consume(
  key: string,
  rule: RateLimitRule,
  nowMs: number = Date.now(),
): RateLimitDecision {
  // Periodic sweep so abandoned keys don't accumulate forever.
  if (nowMs - lastSweep > 60_000) {
    lastSweep = nowMs;
    for (const [k, hits] of store) {
      if (hits.every((t) => t <= nowMs - rule.windowMs)) store.delete(k);
    }
  }

  const { decision, hits } = slideWindow(store.get(key) ?? [], nowMs, rule);
  store.set(key, hits);
  return decision;
}

// Rules for the sensitive surfaces (documented in docs/OPERATIONS.md).
export const RULES = {
  /** Credential guessing — per email+IP-ish key. */
  auth: { limit: 10, windowMs: 15 * 60_000 },
  /** Account creation — per key. */
  register: { limit: 5, windowMs: 60 * 60_000 },
  /** RFQ sends per org (leads are the paid product — no spam). */
  rfqSend: { limit: 30, windowMs: 60 * 60_000 },
  /** Chat messages per user. */
  chatPost: { limit: 60, windowMs: 60_000 },
  /** Quote submissions per org. */
  quote: { limit: 60, windowMs: 60 * 60_000 },
  /** Import parses per user (file parsing is CPU-heavy). */
  importParse: { limit: 20, windowMs: 10 * 60_000 },
} as const satisfies Record<string, RateLimitRule>;
