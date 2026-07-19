import { describe, it, expect } from "vitest";
import {
  SPEC_STATUSES,
  deriveSpecStatus,
  statusVariant,
} from "@/lib/spec/status";
import { shade } from "@/lib/ui/texture";

describe("deriveSpecStatus", () => {
  it("empty when there is nothing", () => {
    expect(deriveSpecStatus({})).toBe("empty");
    expect(deriveSpecStatus({ optionCount: 0 })).toBe("empty");
  });

  it("options when options exist but nothing confirmed", () => {
    expect(deriveSpecStatus({ optionCount: 2 })).toBe("options");
  });

  it("chosen when a material is confirmed", () => {
    expect(
      deriveSpecStatus({ confirmedMaterialId: "m1", optionCount: 2 }),
    ).toBe("chosen");
  });

  it("sent/quoted win over chosen (RFQ in flight)", () => {
    expect(
      deriveSpecStatus({ confirmedMaterialId: "m1", hasSentRfq: true }),
    ).toBe("sent");
    expect(
      deriveSpecStatus({ confirmedMaterialId: "m1", hasSentRfq: true, hasQuote: true }),
    ).toBe("quoted");
  });
});

describe("statusVariant", () => {
  it("maps every status to a defined variant", () => {
    const variants = SPEC_STATUSES.map(statusVariant);
    expect(variants).toEqual(["neutral", "warn", "ok", "info", "quoted"]);
    // no status left unmapped
    expect(variants.every(Boolean)).toBe(true);
  });
});

describe("shade", () => {
  it("lightens and darkens within [00,ff] bounds", () => {
    expect(shade("#808080", 16)).toBe("#909090");
    expect(shade("#808080", -16)).toBe("#707070");
    expect(shade("#ffffff", 30)).toBe("#ffffff"); // clamped high
    expect(shade("#000000", -30)).toBe("#000000"); // clamped low
  });
});
