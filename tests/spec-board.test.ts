import { describe, it, expect } from "vitest";
import { boardOrder, optionEmphasis } from "@/lib/spec/board";

describe("optionEmphasis", () => {
  it("confirmed → primary, else faded", () => {
    expect(optionEmphasis({ materialId: "a", isConfirmed: true })).toBe("primary");
    expect(optionEmphasis({ materialId: "b", isConfirmed: false })).toBe("faded");
  });
});

describe("boardOrder", () => {
  it("puts the confirmed option first, keeps the rest stable", () => {
    const opts = [
      { materialId: "a", isConfirmed: false },
      { materialId: "b", isConfirmed: false },
      { materialId: "c", isConfirmed: true },
    ];
    expect(boardOrder(opts).map((o) => o.materialId)).toEqual(["c", "a", "b"]);
  });

  it("is a no-op when nothing is confirmed and does not mutate input", () => {
    const opts = [
      { materialId: "a", isConfirmed: false },
      { materialId: "b", isConfirmed: false },
    ];
    const copy = [...opts];
    expect(boardOrder(opts).map((o) => o.materialId)).toEqual(["a", "b"]);
    expect(opts).toEqual(copy);
  });
});
