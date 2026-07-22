import { describe, expect, it } from "vitest";
import { computeBudget } from "@/lib/spec/budget";

describe("computeBudget", () => {
  it("uses the best quote when present, list price otherwise", () => {
    const r = computeBudget([
      { qty: "10", listPrice: "100", bestQuote: "90" }, // 900 best / 1000 list
      { qty: "2", listPrice: "50", bestQuote: null }, // 100 / 100
    ]);
    expect(r.bestTotal).toBe(1000);
    expect(r.listTotal).toBe(1100);
    expect(r.savings).toBe(100);
    expect(r.pricedLines).toBe(2);
    expect(r.totalLines).toBe(2);
  });

  it("skips lines without qty or any price", () => {
    const r = computeBudget([
      { qty: null, listPrice: "100", bestQuote: null },
      { qty: "5", listPrice: null, bestQuote: null },
      { qty: "3", listPrice: null, bestQuote: "40" }, // quote-only line
    ]);
    expect(r.pricedLines).toBe(1);
    expect(r.bestTotal).toBe(120);
    // No list price → contributes equally, no phantom savings.
    expect(r.savings).toBe(0);
  });

  it("never reports negative savings when a quote beats nothing", () => {
    const r = computeBudget([{ qty: "4", listPrice: "10", bestQuote: "15" }]);
    expect(r.bestTotal).toBe(60);
    expect(r.savings).toBe(0);
  });

  it("handles empty schedules", () => {
    const r = computeBudget([]);
    expect(r).toEqual({ bestTotal: 0, listTotal: 0, savings: 0, pricedLines: 0, totalLines: 0 });
  });
});
