import { describe, expect, it } from "vitest";
import {
  type ApplyTargetItem,
  type SetMaterial,
  canUseMaterialSets,
  canUseTemplates,
  parseStructure,
  planSetApplication,
  structureFromItems,
} from "@/lib/templates/logic";

describe("Studio gate (AC: gate ทำงาน)", () => {
  it("locks templates + sets below Studio", () => {
    expect(canUseTemplates("free")).toBe(false);
    expect(canUseTemplates("pro")).toBe(false);
    expect(canUseTemplates("studio")).toBe(true);
    expect(canUseMaterialSets("free")).toBe(false);
    expect(canUseMaterialSets("pro")).toBe(false);
    expect(canUseMaterialSets("studio")).toBe(true);
  });
});

describe("structureFromItems / parseStructure round-trip", () => {
  const items = [
    { code: "FL-01", zone: "Living", category: "กระเบื้อง", qtyUnit: "ตร.ม." },
    { code: "WL-01", zone: null, category: null, qtyUnit: null },
  ];

  it("keeps codes/zones/categories/units, in order", () => {
    const lines = parseStructure(structureFromItems(items) as unknown);
    expect(lines).toEqual(items);
  });

  it("drops garbage rows and rejects non-arrays", () => {
    expect(parseStructure("nope")).toEqual([]);
    expect(parseStructure([{ code: "" }, null, 7, { code: "OK-01" }])).toEqual([
      { code: "OK-01", zone: null, category: null, qtyUnit: null },
    ]);
  });
});

describe("planSetApplication (AC: apply set ลงโปรเจกต์ได้)", () => {
  const set: SetMaterial[] = [
    { id: "m1", category: "tile" },
    { id: "m2", category: "tile" },
    { id: "m3", category: "wood" },
  ];

  const item = (over: Partial<ApplyTargetItem>): ApplyTargetItem => ({
    id: "i1",
    category: "tile",
    confirmedMaterialId: null,
    optionMaterialIds: [],
    ...over,
  });

  it("adds matching-category materials as options", () => {
    const plan = planSetApplication([item({})], set);
    expect(plan.additions).toEqual([
      { itemId: "i1", materialId: "m1" },
      { itemId: "i1", materialId: "m2" },
    ]);
  });

  it("skips materials already on the line", () => {
    const plan = planSetApplication([item({ optionMaterialIds: ["m1"] })], set);
    expect(plan.additions).toEqual([{ itemId: "i1", materialId: "m2" }]);
  });

  it("never touches a confirmed line", () => {
    const plan = planSetApplication([item({ confirmedMaterialId: "mX" })], set);
    expect(plan.additions).toHaveLength(0);
    expect(plan.skippedConfirmed).toBe(1);
  });

  it("respects the 4-option cap", () => {
    const plan = planSetApplication(
      [item({ optionMaterialIds: ["a", "b", "c"] })], // 1 slot left
      set,
    );
    expect(plan.additions).toEqual([{ itemId: "i1", materialId: "m1" }]);
    expect(plan.skippedFull).toBe(1);
  });

  it("ignores lines with no category and non-matching categories", () => {
    const plan = planSetApplication(
      [item({ id: "i2", category: null }), item({ id: "i3", category: "paint" })],
      set,
    );
    expect(plan.additions).toHaveLength(0);
    expect(plan.skippedConfirmed).toBe(0);
    expect(plan.skippedFull).toBe(0);
  });

  it("a confirmed line with no matching candidates is not counted as skipped", () => {
    const plan = planSetApplication(
      [item({ category: "paint", confirmedMaterialId: "mX" })],
      set,
    );
    expect(plan.skippedConfirmed).toBe(0);
  });
});
