import { describe, expect, it } from "vitest";
import {
  DESIGNER_PLANS,
  DESIGNER_PLAN_ORDER,
  isDesignerPlan,
  isUpgrade,
  planIncludes,
  requiredPlanFor,
} from "@/lib/billing/plans";
import { canManageBilling } from "@/lib/permissions";

describe("plan pricing (DECISIONS: 390–690 THB/seat)", () => {
  it("free is 0, pro 390, studio 690", () => {
    expect(DESIGNER_PLANS.free.priceThb).toBe(0);
    expect(DESIGNER_PLANS.pro.priceThb).toBe(390);
    expect(DESIGNER_PLANS.studio.priceThb).toBe(690);
  });
});

describe("planIncludes — the freemium boundary", () => {
  it("keeps the backbone free (no gates on Free)", () => {
    expect(DESIGNER_PLANS.free.gates).toHaveLength(0);
  });
  it("gates VE Finder + Revit behind Pro (CLAUDE.md)", () => {
    expect(planIncludes("free", "ve_finder")).toBe(false);
    expect(planIncludes("free", "revit_export")).toBe(false);
    expect(planIncludes("pro", "ve_finder")).toBe(true);
    expect(planIncludes("pro", "revit_export")).toBe(true);
  });
  it("gates Templates + Material Sets behind Studio (ROADMAP 3.2)", () => {
    expect(planIncludes("pro", "templates")).toBe(false);
    expect(planIncludes("pro", "material_sets")).toBe(false);
    expect(planIncludes("studio", "templates")).toBe(true);
    expect(planIncludes("studio", "material_sets")).toBe(true);
  });
  it("Studio is a superset of Pro's gates", () => {
    for (const g of DESIGNER_PLANS.pro.gates) {
      expect(planIncludes("studio", g)).toBe(true);
    }
  });
});

describe("requiredPlanFor", () => {
  it("returns the cheapest unlocking tier", () => {
    expect(requiredPlanFor("ve_finder")).toBe("pro");
    expect(requiredPlanFor("templates")).toBe("studio");
  });
});

describe("isUpgrade", () => {
  it("is true only for a strictly higher tier", () => {
    expect(isUpgrade("free", "pro")).toBe(true);
    expect(isUpgrade("free", "studio")).toBe(true);
    expect(isUpgrade("pro", "studio")).toBe(true);
    expect(isUpgrade("pro", "pro")).toBe(false);
    expect(isUpgrade("studio", "pro")).toBe(false);
    expect(isUpgrade("studio", "free")).toBe(false);
  });
});

describe("isDesignerPlan", () => {
  it("accepts the three designer tiers, rejects seller/garbage", () => {
    expect(DESIGNER_PLAN_ORDER.every(isDesignerPlan)).toBe(true);
    expect(isDesignerPlan("standard")).toBe(false);
    expect(isDesignerPlan("")).toBe(false);
  });
});

describe("canManageBilling — owner only", () => {
  it("only the owner controls billing", () => {
    expect(canManageBilling("owner")).toBe(true);
    expect(canManageBilling("editor")).toBe(false);
    expect(canManageBilling("viewer")).toBe(false);
  });
});
