import { describe, expect, it } from "vitest";
import { RULES, consume, slideWindow } from "@/lib/rate-limit";

const RULE = { limit: 3, windowMs: 60_000 };

describe("slideWindow (pure)", () => {
  it("allows until the limit, then blocks with a sane Retry-After", () => {
    let hits: number[] = [];
    for (let i = 0; i < 3; i++) {
      const r = slideWindow(hits, 1_000 + i, RULE);
      expect(r.decision.allowed).toBe(true);
      hits = r.hits;
    }
    const blocked = slideWindow(hits, 1_003, RULE);
    expect(blocked.decision.allowed).toBe(false);
    expect(blocked.decision.retryAfterSec).toBeGreaterThanOrEqual(1);
    expect(blocked.decision.retryAfterSec).toBeLessThanOrEqual(60);
  });

  it("frees capacity once old hits leave the window", () => {
    const { hits } = slideWindow([0, 1, 2], 3, RULE); // full... 3 live hits
    expect(slideWindow(hits, 4, RULE).decision.allowed).toBe(false);
    // 61s later the first hits expired
    const later = slideWindow(hits, 61_001, RULE);
    expect(later.decision.allowed).toBe(true);
    // and expired timestamps were dropped from the kept list
    expect(later.hits.every((t) => t > 61_001 - RULE.windowMs)).toBe(true);
  });

  it("counts remaining correctly", () => {
    const r = slideWindow([], 0, RULE);
    expect(r.decision.remaining).toBe(2);
  });
});

describe("consume (store)", () => {
  it("isolates keys", () => {
    const rule = { limit: 1, windowMs: 60_000 };
    expect(consume("k1", rule, 1).allowed).toBe(true);
    expect(consume("k1", rule, 2).allowed).toBe(false);
    expect(consume("k2", rule, 2).allowed).toBe(true);
  });
});

describe("RULES sanity", () => {
  it("every surface has a positive limit and window", () => {
    for (const rule of Object.values(RULES)) {
      expect(rule.limit).toBeGreaterThan(0);
      expect(rule.windowMs).toBeGreaterThan(0);
    }
  });
  it("login throttle is tight enough to matter, loose enough for humans", () => {
    expect(RULES.auth.limit).toBeLessThanOrEqual(20);
    expect(RULES.auth.limit).toBeGreaterThanOrEqual(5);
  });
});
