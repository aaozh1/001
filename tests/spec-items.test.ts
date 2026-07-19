import { describe, it, expect } from "vitest";
import {
  assignSortOrder,
  isSamePermutation,
  moveItem,
} from "@/lib/spec/reorder";
import {
  createSpecItemSchema,
  reorderSpecItemsSchema,
  updateSpecItemSchema,
} from "@/lib/spec/schemas";

describe("moveItem", () => {
  const ids = ["a", "b", "c"];
  it("moves up and down", () => {
    expect(moveItem(ids, "b", -1)).toEqual(["b", "a", "c"]);
    expect(moveItem(ids, "b", 1)).toEqual(["a", "c", "b"]);
  });
  it("is a no-op at the boundaries", () => {
    expect(moveItem(ids, "a", -1)).toEqual(ids);
    expect(moveItem(ids, "c", 1)).toEqual(ids);
  });
  it("ignores unknown ids and does not mutate the input", () => {
    expect(moveItem(ids, "z", -1)).toEqual(ids);
    moveItem(ids, "b", -1);
    expect(ids).toEqual(["a", "b", "c"]);
  });
});

describe("assignSortOrder", () => {
  it("assigns contiguous 0-based order", () => {
    expect(assignSortOrder(["x", "y"])).toEqual([
      { id: "x", sortOrder: 0 },
      { id: "y", sortOrder: 1 },
    ]);
  });
});

describe("isSamePermutation", () => {
  const current = ["a", "b", "c"];
  it("accepts a reordering of the same set", () => {
    expect(isSamePermutation(current, ["c", "a", "b"])).toBe(true);
  });
  it("rejects wrong length, duplicates, or foreign ids", () => {
    expect(isSamePermutation(current, ["a", "b"])).toBe(false);
    expect(isSamePermutation(current, ["a", "a", "b"])).toBe(false);
    expect(isSamePermutation(current, ["a", "b", "z"])).toBe(false);
  });
});

describe("spec-item schemas", () => {
  it("create requires a non-empty code", () => {
    expect(createSpecItemSchema.safeParse({ code: "FL-01" }).success).toBe(true);
    expect(createSpecItemSchema.safeParse({ code: "  " }).success).toBe(false);
    expect(createSpecItemSchema.safeParse({}).success).toBe(false);
  });

  it("coerces qty from a string and allows null", () => {
    const a = createSpecItemSchema.parse({ code: "X", qty: "48" });
    expect(a.qty).toBe(48);
    const b = updateSpecItemSchema.parse({ qty: null });
    expect(b.qty).toBeNull();
  });

  it("rejects negative qty", () => {
    expect(createSpecItemSchema.safeParse({ code: "X", qty: "-3" }).success).toBe(
      false,
    );
  });

  it("update rejects an empty patch", () => {
    expect(updateSpecItemSchema.safeParse({}).success).toBe(false);
    expect(updateSpecItemSchema.safeParse({ zone: "bath" }).success).toBe(true);
  });

  it("reorder requires a non-empty id list", () => {
    expect(reorderSpecItemsSchema.safeParse({ orderedIds: ["a"] }).success).toBe(
      true,
    );
    expect(reorderSpecItemsSchema.safeParse({ orderedIds: [] }).success).toBe(
      false,
    );
  });
});
