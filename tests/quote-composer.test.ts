import { describe, expect, it } from "vitest";
import { computeQuoteSummary, formatBaht } from "@/lib/quote/composer";

describe("computeQuoteSummary", () => {
  it("computes line total and discount vs list price (the mock's −4%)", () => {
    const s = computeQuoteSummary({ qty: 460, unitPrice: 1392, listPrice: 1450 });
    expect(s.lineTotal).toBe(640_320);
    expect(s.discountPct).toBe(-4);
  });

  it("returns nulls when qty or prices are missing", () => {
    expect(computeQuoteSummary({ qty: null, unitPrice: 100, listPrice: 90 })).toEqual({
      lineTotal: null,
      discountPct: 11,
    });
    expect(computeQuoteSummary({ qty: 10, unitPrice: null, listPrice: 90 })).toEqual({
      lineTotal: null,
      discountPct: null,
    });
    expect(computeQuoteSummary({ qty: 10, unitPrice: 100, listPrice: null })).toEqual({
      lineTotal: 1000,
      discountPct: null,
    });
  });

  it("treats zero and negative inputs as missing", () => {
    expect(computeQuoteSummary({ qty: 0, unitPrice: 100, listPrice: 0 })).toEqual({
      lineTotal: null,
      discountPct: null,
    });
    expect(computeQuoteSummary({ qty: -5, unitPrice: -1, listPrice: 100 })).toEqual({
      lineTotal: null,
      discountPct: null,
    });
  });

  it("shows a markup as a positive percent", () => {
    expect(computeQuoteSummary({ qty: 1, unitPrice: 110, listPrice: 100 }).discountPct).toBe(10);
  });
});

describe("formatBaht", () => {
  it("groups thousands with the ฿ prefix", () => {
    expect(formatBaht(640320)).toBe("฿640,320");
    expect(formatBaht(1392.5)).toBe("฿1,392.5");
  });
});
