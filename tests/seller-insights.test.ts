import { describe, expect, it } from "vitest";
import { computeDemandInsights } from "@/lib/seller/insights";

const base = {
  searchesThisMonth: 0,
  searchesLastMonth: 0,
  rfqTotal: 0,
  rfqQuoted: 0,
  filterCounts: [],
  materials: [],
};

describe("computeDemandInsights", () => {
  it("computes the month-over-month trend", () => {
    const r = computeDemandInsights({ ...base, searchesThisMonth: 140, searchesLastMonth: 100 });
    expect(r.trendPct).toBe(40);
  });

  it("returns null trend when last month had no searches (no fake +∞%)", () => {
    const r = computeDemandInsights({ ...base, searchesThisMonth: 50, searchesLastMonth: 0 });
    expect(r.trendPct).toBeNull();
  });

  it("ranks filter bars by usage as a share of searches, top 5 only", () => {
    const r = computeDemandInsights({
      ...base,
      searchesThisMonth: 200,
      filterCounts: [
        { key: "cert", count: 124 },
        { key: "priceMax", count: 90 },
        { key: "brand", count: 40 },
        { key: "verified", count: 30 },
        { key: "priceMin", count: 20 },
        { key: "q", count: 10 },
      ],
    });
    expect(r.bars).toHaveLength(5);
    expect(r.bars[0]).toEqual({ key: "cert", sharePct: 62 });
    expect(r.topFilter?.key).toBe("cert");
    expect(r.bars.map((b) => b.key)).not.toContain("q");
  });

  it("nudges on the heaviest mappable filter a material is missing", () => {
    const r = computeDemandInsights({
      ...base,
      searchesThisMonth: 100,
      filterCounts: [
        { key: "brand", count: 80 }, // heavier but not mappable to a field
        { key: "cert", count: 62 },
      ],
      materials: [
        { id: "m1", name: "Jade Green", missing: ["cert"] },
        { id: "m2", name: "Complete One", missing: [] },
      ],
    });
    expect(r.gap).toEqual({ materialId: "m1", name: "Jade Green", filterKey: "cert", sharePct: 62 });
  });

  it("returns no gap when materials are complete or there is no filter data", () => {
    expect(
      computeDemandInsights({
        ...base,
        searchesThisMonth: 10,
        filterCounts: [{ key: "cert", count: 5 }],
        materials: [{ id: "m", name: "x", missing: [] }],
      }).gap,
    ).toBeNull();
    expect(computeDemandInsights(base).gap).toBeNull();
  });

  it("passes RFQ counts through untouched (aggregate counts only)", () => {
    const r = computeDemandInsights({ ...base, rfqTotal: 17, rfqQuoted: 9 });
    expect(r.rfqTotal).toBe(17);
    expect(r.rfqQuoted).toBe(9);
  });
});
