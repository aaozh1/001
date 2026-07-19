import { describe, it, expect } from "vitest";
import { selectionOutcome } from "@/lib/quote/logic";

describe("selectionOutcome", () => {
  it("marks the chosen quote selected and the rest rejected", () => {
    expect(selectionOutcome(["a", "b", "c"], "b")).toEqual({
      selected: "b",
      rejected: ["a", "c"],
    });
  });

  it("a sole quote wins with no rejections", () => {
    expect(selectionOutcome(["a"], "a")).toEqual({ selected: "a", rejected: [] });
  });

  it("rejects a quote id that isn't in the set (guards foreign ids)", () => {
    expect(selectionOutcome(["a", "b"], "z")).toBeNull();
    expect(selectionOutcome([], "a")).toBeNull();
  });
});
