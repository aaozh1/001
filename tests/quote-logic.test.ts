import { describe, it, expect } from "vitest";
import {
  effectiveUnitPrice,
  isQuoteValid,
  lineTotal,
  rfqStatusAfterQuote,
} from "@/lib/quote/logic";

describe("effectiveUnitPrice", () => {
  it("subtracts the discount and never goes below 0", () => {
    expect(effectiveUnitPrice(100, null)).toBe(100);
    expect(effectiveUnitPrice(100, 20)).toBe(80);
    expect(effectiveUnitPrice(100, 150)).toBe(0);
  });
});

describe("lineTotal", () => {
  it("multiplies effective price by quantity", () => {
    expect(lineTotal(100, 20, 10)).toBe(800);
  });
  it("is 0 when quantity is unknown or non-positive", () => {
    expect(lineTotal(100, null, null)).toBe(0);
    expect(lineTotal(100, null, 0)).toBe(0);
  });
});

describe("isQuoteValid", () => {
  const now = new Date("2026-07-19T00:00:00.000Z");
  it("no expiry is always valid", () => {
    expect(isQuoteValid(null, now)).toBe(true);
  });
  it("future expiry valid, past expiry invalid", () => {
    expect(isQuoteValid(new Date("2026-08-01T00:00:00Z"), now)).toBe(true);
    expect(isQuoteValid(new Date("2026-07-01T00:00:00Z"), now)).toBe(false);
  });
});

describe("rfqStatusAfterQuote", () => {
  it("open → quoted; other states unchanged", () => {
    expect(rfqStatusAfterQuote("open")).toBe("quoted");
    expect(rfqStatusAfterQuote("quoted")).toBe("quoted");
    expect(rfqStatusAfterQuote("closed_won")).toBe("closed_won");
  });
});
