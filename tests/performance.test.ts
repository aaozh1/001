import { describe, expect, it } from "vitest";
import { type RecipientStat, computePerformance } from "@/lib/seller/performance";

const at = (iso: string) => new Date(iso);

describe("computePerformance (ROADMAP 3.4)", () => {
  it("returns nulls (not fake zeros) when there is no history", () => {
    const s = computePerformance([]);
    expect(s.received).toBe(0);
    expect(s.responseRate).toBeNull();
    expect(s.avgResponseHours).toBeNull();
    expect(s.winRate).toBeNull();
  });

  it("computes response rate + average reply hours", () => {
    const rows: RecipientStat[] = [
      // answered in 12h
      {
        sentAt: at("2026-07-01T00:00:00Z"),
        respondedAt: at("2026-07-01T12:00:00Z"),
        quoteStatus: "submitted",
      },
      // answered in 36h
      {
        sentAt: at("2026-07-02T00:00:00Z"),
        respondedAt: at("2026-07-03T12:00:00Z"),
        quoteStatus: "submitted",
      },
      // never answered
      { sentAt: at("2026-07-04T00:00:00Z"), respondedAt: null, quoteStatus: null },
      { sentAt: at("2026-07-05T00:00:00Z"), respondedAt: null, quoteStatus: null },
    ];
    const s = computePerformance(rows);
    expect(s.received).toBe(4);
    expect(s.answered).toBe(2);
    expect(s.responseRate).toBe(50);
    expect(s.avgResponseHours).toBe(24);
  });

  it("win rate counts only DECIDED quotes (submitted ones aren't losses yet)", () => {
    const rows: RecipientStat[] = [
      { sentAt: at("2026-07-01T00:00:00Z"), respondedAt: at("2026-07-01T01:00:00Z"), quoteStatus: "selected" },
      { sentAt: at("2026-07-02T00:00:00Z"), respondedAt: at("2026-07-02T01:00:00Z"), quoteStatus: "rejected" },
      { sentAt: at("2026-07-03T00:00:00Z"), respondedAt: at("2026-07-03T01:00:00Z"), quoteStatus: "rejected" },
      { sentAt: at("2026-07-04T00:00:00Z"), respondedAt: at("2026-07-04T01:00:00Z"), quoteStatus: "submitted" },
    ];
    const s = computePerformance(rows);
    expect(s.quotesDecided).toBe(3);
    expect(s.won).toBe(1);
    expect(s.winRate).toBe(33);
  });

  it("a respondedAt earlier than sentAt is clamped, not negative", () => {
    const s = computePerformance([
      {
        sentAt: at("2026-07-01T10:00:00Z"),
        respondedAt: at("2026-07-01T09:00:00Z"),
        quoteStatus: null,
      },
    ]);
    expect(s.avgResponseHours).toBe(0);
  });
});
