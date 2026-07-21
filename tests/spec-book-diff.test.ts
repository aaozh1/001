import { describe, expect, it } from "vitest";
import { diffSnapshots } from "@/lib/spec-book/diff";
import type { SpecBookSnapshot } from "@/lib/spec-book/snapshot";

const opt = (name: string, isConfirmed = false) => ({
  name, nameEn: null, brand: null, model: null, sku: null, sellerName: null,
  price: null, unit: null, specTh: null, specEn: null, cert: null, leadTime: null,
  moq: null, warranty: null, noteTh: null, noteEn: null, swatchHex: null,
  image: null, isConfirmed,
});
const snap = (items: { code: string; options: ReturnType<typeof opt>[] }[]): SpecBookSnapshot => ({
  projectName: "p", buildingType: null, generatedAt: "x",
  items: items.map((i) => ({ code: i.code, zone: null, category: null, qty: null, qtyUnit: null, options: i.options })),
});

describe("diffSnapshots (5G)", () => {
  it("first version: everything is added", () => {
    const d = diffSnapshots(null, snap([{ code: "A", options: [] }, { code: "B", options: [] }]));
    expect(d).toEqual({ added: 2, removed: 0, changed: 0, confirmed: 0 });
  });

  it("classifies added/removed/changed/confirmed", () => {
    const prev = snap([
      { code: "A", options: [opt("x")] },
      { code: "B", options: [opt("y")] },
      { code: "C", options: [opt("z")] },
    ]);
    const next = snap([
      { code: "A", options: [opt("x", true)] }, // newly confirmed
      { code: "B", options: [opt("y2")] }, // palette changed
      { code: "D", options: [] }, // added; C removed
    ]);
    expect(diffSnapshots(prev, next)).toEqual({ added: 1, removed: 1, changed: 1, confirmed: 1 });
  });

  it("identical snapshots diff to zero", () => {
    const a = snap([{ code: "A", options: [opt("x", true)] }]);
    expect(diffSnapshots(a, a)).toEqual({ added: 0, removed: 0, changed: 0, confirmed: 0 });
  });
});
