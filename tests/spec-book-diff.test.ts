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

const counts = (d: ReturnType<typeof diffSnapshots>) => ({
  added: d.added, removed: d.removed, changed: d.changed, confirmed: d.confirmed,
});

describe("diffSnapshots (5G)", () => {
  it("first version: everything is added", () => {
    const d = diffSnapshots(null, snap([{ code: "A", options: [] }, { code: "B", options: [] }]));
    expect(counts(d)).toEqual({ added: 2, removed: 0, changed: 0, confirmed: 0 });
    expect(d.entries).toHaveLength(2);
    expect(d.entries[0]).toMatchObject({ kind: "added", code: "A" });
  });

  it("classifies added/removed/changed/confirmed with per-item entries", () => {
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
    const d = diffSnapshots(prev, next);
    expect(counts(d)).toEqual({ added: 1, removed: 1, changed: 1, confirmed: 1 });
    const byKind = Object.fromEntries(d.entries.map((e) => [e.kind, e]));
    expect(byKind.confirmed).toMatchObject({ code: "A", to: "x" });
    expect(byKind.changed).toMatchObject({ code: "B", from: "y", to: "y2" });
    expect(byKind.removed).toMatchObject({ code: "C", from: "z" });
    expect(byKind.added).toMatchObject({ code: "D", to: null });
  });

  it("identical snapshots diff to zero with no entries", () => {
    const a = snap([{ code: "A", options: [opt("x", true)] }]);
    const d = diffSnapshots(a, a);
    expect(counts(d)).toEqual({ added: 0, removed: 0, changed: 0, confirmed: 0 });
    expect(d.entries).toEqual([]);
  });
});
