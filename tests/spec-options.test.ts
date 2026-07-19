import { describe, it, expect } from "vitest";
import {
  MAX_SPEC_OPTIONS,
  canAddOption,
  isConfirmable,
  remainingOptionSlots,
} from "@/lib/spec/options";
import { deriveSpecStatus } from "@/lib/spec/status";

describe("option limits", () => {
  it("allows up to MAX_SPEC_OPTIONS (4)", () => {
    expect(MAX_SPEC_OPTIONS).toBe(4);
    expect(canAddOption(0)).toBe(true);
    expect(canAddOption(3)).toBe(true);
    expect(canAddOption(4)).toBe(false);
    expect(canAddOption(5)).toBe(false);
  });

  it("reports remaining slots", () => {
    expect(remainingOptionSlots(0)).toBe(4);
    expect(remainingOptionSlots(3)).toBe(1);
    expect(remainingOptionSlots(4)).toBe(0);
    expect(remainingOptionSlots(9)).toBe(0);
  });
});

describe("isConfirmable", () => {
  it("only a material that is an option can be confirmed", () => {
    expect(isConfirmable(["a", "b"], "a")).toBe(true);
    expect(isConfirmable(["a", "b"], "c")).toBe(false);
    expect(isConfirmable([], "a")).toBe(false);
  });
});

describe("status transition on confirm", () => {
  it("options -> chosen when a material is confirmed", () => {
    // two options, nothing confirmed yet
    expect(deriveSpecStatus({ optionCount: 2 })).toBe("options");
    // after confirming one of them
    expect(
      deriveSpecStatus({ optionCount: 2, confirmedMaterialId: "a" }),
    ).toBe("chosen");
    // clearing the confirmation returns to options
    expect(
      deriveSpecStatus({ optionCount: 2, confirmedMaterialId: null }),
    ).toBe("options");
  });
});
