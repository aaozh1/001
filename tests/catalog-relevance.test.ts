import { describe, it, expect } from "vitest";
import { materialRelevance, rankMaterials } from "@/lib/materials/relevance";
import { categoryLabel, categoryTexture } from "@/lib/materials/categories";

const mk = (o: Partial<Parameters<typeof materialRelevance>[0]>) => ({
  nameTh: "",
  nameEn: null,
  brand: null,
  model: null,
  sku: null,
  completeness: 0,
  ...o,
});

describe("materialRelevance", () => {
  it("scores 0 for an empty query", () => {
    expect(materialRelevance(mk({ nameTh: "COTTO", completeness: 90 }), "")).toBe(0);
  });

  it("ranks an exact SKU/model match above a mere brand substring", () => {
    const exact = materialRelevance(mk({ model: "Arctic" }), "arctic");
    const brandish = materialRelevance(mk({ brand: "Arctic Ceramics" }), "arctic");
    expect(exact).toBeGreaterThan(brandish);
  });

  it("prefix beats substring", () => {
    const prefix = materialRelevance(mk({ nameTh: "COTTO Arctic" }), "cotto");
    const sub = materialRelevance(mk({ nameTh: "Best COTTO tile" }), "cotto");
    expect(prefix).toBeGreaterThan(sub);
  });

  it("matches name in either language", () => {
    expect(
      materialRelevance(mk({ nameTh: "กระเบื้อง", nameEn: "Porcelain tile" }), "porcelain"),
    ).toBeGreaterThan(0);
  });
});

describe("rankMaterials", () => {
  it("with a query, a real text match beats higher completeness", () => {
    const match = mk({ nameTh: "x", model: "COTTO", completeness: 10 });
    const rich = mk({ nameTh: "y", completeness: 100 });
    const out = rankMaterials([rich, match], "cotto");
    expect(out[0]).toBe(match); // relevance wins over completeness (neutral)
  });

  it("with no query, orders by completeness then name (neutral)", () => {
    const a = mk({ nameTh: "Beta", completeness: 50 });
    const b = mk({ nameTh: "Alpha", completeness: 90 });
    const c = mk({ nameTh: "Alpha2", completeness: 50 });
    const out = rankMaterials([a, b, c], "");
    expect(out.map((m) => m.completeness)).toEqual([90, 50, 50]);
    expect(out[0]).toBe(b); // highest completeness first
    // then the two 50s tie-break by name: "Alpha2" < "Beta"
    expect(out[1]).toBe(c);
    expect(out[2]).toBe(a);
  });

  it("does not mutate the input array", () => {
    const arr = [mk({ nameTh: "a" }), mk({ nameTh: "b" })];
    const copy = [...arr];
    rankMaterials(arr, "");
    expect(arr).toEqual(copy);
  });
});

describe("category labels", () => {
  it("maps TH key to EN, falls back to the key", () => {
    expect(categoryLabel("โลหะ & เหล็ก", "en")).toBe("Metal & Steel");
    expect(categoryLabel("โลหะ & เหล็ก", "th")).toBe("โลหะ & เหล็ก");
    expect(categoryLabel("unknown", "en")).toBe("unknown");
  });
  it("has a texture for known families", () => {
    expect(categoryTexture("ไม้จริง & ไม้เอนจิเนียร์")).toBe("wood");
    expect(categoryTexture("unknown")).toBe("solid");
  });
});
