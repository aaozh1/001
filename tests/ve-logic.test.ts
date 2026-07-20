import { describe, expect, it } from "vitest";
import {
  projectSavings,
  rankVeCandidates,
  savingPercent,
  specTokens,
  veSimilarity,
  type VeBase,
  type VeCandidateInput,
} from "@/lib/ve/logic";

const base: VeBase = {
  price: 1000,
  unit: "ตร.ม.",
  specText: "ดูดซึมน้ำ <0.5% Matt R9",
  cert: "มอก. 2508",
  warranty: "10 ปี",
  leadTime: "7 วัน",
  size: "60×60 ซม.",
};

const cand = (over: Partial<VeCandidateInput>): VeCandidateInput => ({
  id: "x",
  price: 800,
  unit: "ตร.ม.",
  specText: null,
  cert: null,
  warranty: null,
  leadTime: null,
  size: null,
  completeness: 50,
  ...over,
});

describe("specTokens / similarity", () => {
  it("tokenises Thai + English + numbers", () => {
    const t = specTokens("ดูดซึมน้ำ <0.5% Matt R9");
    expect(t.has("matt")).toBe(true);
    expect(t.has("r9")).toBe(true);
    expect(t.has("0.5%")).toBe(true);
  });

  it("identical specs + facts score near 1; empty scores low", () => {
    const same = cand({
      specText: base.specText,
      cert: base.cert,
      warranty: base.warranty,
      size: base.size,
    });
    expect(veSimilarity(base, same)).toBeGreaterThan(0.9);
    expect(veSimilarity(base, cand({}))).toBeLessThan(0.2);
  });
});

describe("rankVeCandidates", () => {
  it("only keeps cheaper, unit-compatible candidates", () => {
    const out = rankVeCandidates(base, [
      cand({ id: "cheaper", price: 700 }),
      cand({ id: "pricier", price: 1200 }),
      cand({ id: "equal", price: 1000 }),
      cand({ id: "wrong-unit", price: 500, unit: "แผ่น" }),
      cand({ id: "free-junk", price: 0 }),
    ]);
    expect(out.map((o) => o.id)).toEqual(["cheaper"]);
  });

  it("ranks by similarity first, savings second", () => {
    const out = rankVeCandidates(base, [
      cand({ id: "cheap-far", price: 300 }),
      cand({ id: "close-spec", price: 900, specText: base.specText, cert: base.cert }),
    ]);
    expect(out[0].id).toBe("close-spec");
    expect(out[1].id).toBe("cheap-far");
    expect(out[1].savingPercent).toBe(70);
  });

  it("caps the list", () => {
    const many = Array.from({ length: 20 }, (_, i) => cand({ id: `c${i}`, price: 500 + i }));
    expect(rankVeCandidates(base, many, 5)).toHaveLength(5);
  });
});

describe("savings math", () => {
  it("savingPercent rounds to one decimal", () => {
    expect(savingPercent(1000, 800)).toBe(20);
    expect(savingPercent(890, 620)).toBe(30.3);
    expect(savingPercent(0, 10)).toBe(0);
  });

  it("projectSavings multiplies by qty and ignores non-savings", () => {
    expect(
      projectSavings([
        { qty: 100, basePrice: 1000, candPrice: 800 }, // 20,000
        { qty: null, basePrice: 500, candPrice: 450 }, // 50 (qty→1)
        { qty: 10, basePrice: 300, candPrice: 400 }, // negative → 0
      ]),
    ).toBe(20050);
  });
});
