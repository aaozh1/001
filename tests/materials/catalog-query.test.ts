import { describe, expect, it } from "vitest";
import {
  catalogParams,
  hasExtraFilters,
  parseCatalogFilters,
  parseCatalogSort,
} from "@/lib/materials/catalog-query";

describe("parseCatalogSort", () => {
  it("accepts known sorts", () => {
    expect(parseCatalogSort("priceAsc")).toBe("priceAsc");
    expect(parseCatalogSort("newest")).toBe("newest");
  });

  it("falls back to neutral relevance for anything else", () => {
    expect(parseCatalogSort(undefined)).toBe("relevance");
    expect(parseCatalogSort("paid_boost")).toBe("relevance");
    expect(parseCatalogSort("")).toBe("relevance");
  });
});

describe("parseCatalogFilters", () => {
  it("parses a full param set", () => {
    const f = parseCatalogFilters({
      category: "กระเบื้อง & พอร์ซเลน",
      brand: ["COTTO", "Duragres"],
      min: "100",
      max: "900",
      cert: "1",
      verified: "1",
    });
    expect(f.category).toBe("กระเบื้อง & พอร์ซเลน");
    expect(f.brands).toEqual(["COTTO", "Duragres"]);
    expect(f.priceMin).toBe(100);
    expect(f.priceMax).toBe(900);
    expect(f.certOnly).toBe(true);
    expect(f.verifiedOnly).toBe(true);
  });

  it("defaults to no filters", () => {
    const f = parseCatalogFilters({});
    expect(f.category).toBeUndefined();
    expect(f.brands).toEqual([]);
    expect(f.certOnly).toBe(false);
    expect(hasExtraFilters(f)).toBe(false);
  });

  it("ignores junk prices and swaps a reversed range", () => {
    expect(parseCatalogFilters({ min: "abc" }).priceMin).toBeUndefined();
    expect(parseCatalogFilters({ min: "-5" }).priceMin).toBeUndefined();
    const swapped = parseCatalogFilters({ min: "900", max: "100" });
    expect(swapped.priceMin).toBe(100);
    expect(swapped.priceMax).toBe(900);
  });

  it("dedupes brands and caps the list", () => {
    const f = parseCatalogFilters({
      brand: ["A", "A", ...Array.from({ length: 30 }, (_, i) => `B${i}`)],
    });
    expect(f.brands[0]).toBe("A");
    expect(new Set(f.brands).size).toBe(f.brands.length);
    expect(f.brands.length).toBeLessThanOrEqual(20);
  });

  it("accepts single-string params (non-array)", () => {
    const f = parseCatalogFilters({ brand: "COTTO", category: "x" });
    expect(f.brands).toEqual(["COTTO"]);
    expect(f.category).toBe("x");
  });
});

describe("catalogParams round-trip", () => {
  it("serialises only active values and omits defaults", () => {
    const p = catalogParams({
      filters: parseCatalogFilters({}),
      sort: "relevance",
      q: "",
      page: 1,
    });
    expect(p.size).toBe(0);
  });

  it("round-trips filters through the URL", () => {
    const filters = parseCatalogFilters({
      category: "โลหะ & เหล็ก",
      brand: ["AlumTech"],
      min: "50",
      cert: "1",
    });
    const p = catalogParams({ filters, sort: "priceDesc", q: "fin", page: 3 });
    const back = parseCatalogFilters({
      category: p.get("category") ?? undefined,
      brand: p.getAll("brand"),
      min: p.get("min") ?? undefined,
      max: p.get("max") ?? undefined,
      cert: p.get("cert") ?? undefined,
      verified: p.get("verified") ?? undefined,
    });
    expect(back).toEqual(filters);
    expect(parseCatalogSort(p.get("sort"))).toBe("priceDesc");
    expect(p.get("q")).toBe("fin");
    expect(p.get("page")).toBe("3");
  });
});
