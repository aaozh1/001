import { describe, it, expect } from "vitest";
import {
  canAccessWorkspace,
  defaultWorkspace,
  isRoleAllowedForWorkspace,
  isWorkspace,
  rolesFromMemberships,
  workspacePath,
} from "@/lib/permissions";

describe("rolesFromMemberships", () => {
  it("derives distinct workspaces from org types", () => {
    expect(
      rolesFromMemberships([{ org: { type: "designer" } }]),
    ).toEqual(["designer"]);
  });

  it("dedupes and returns canonical order (designer before seller)", () => {
    const roles = rolesFromMemberships([
      { org: { type: "seller" } },
      { org: { type: "designer" } },
      { org: { type: "seller" } },
    ]);
    expect(roles).toEqual(["designer", "seller"]);
  });

  it("ignores unknown org types", () => {
    expect(rolesFromMemberships([{ org: { type: "admin" } }])).toEqual([]);
  });

  it("handles no memberships", () => {
    expect(rolesFromMemberships([])).toEqual([]);
  });
});

describe("canAccessWorkspace", () => {
  it("grants access only to owned workspaces", () => {
    expect(canAccessWorkspace(["designer"], "designer")).toBe(true);
    expect(canAccessWorkspace(["designer"], "seller")).toBe(false);
    expect(canAccessWorkspace(["designer", "seller"], "seller")).toBe(true);
    expect(canAccessWorkspace([], "designer")).toBe(false);
  });
});

describe("defaultWorkspace", () => {
  it("prefers designer when a user has both", () => {
    expect(defaultWorkspace(["seller", "designer"])).toBe("designer");
  });

  it("returns the sole workspace", () => {
    expect(defaultWorkspace(["seller"])).toBe("seller");
  });

  it("returns null when there is none", () => {
    expect(defaultWorkspace([])).toBeNull();
  });
});

describe("workspacePath", () => {
  it("maps a workspace to its URL prefix", () => {
    expect(workspacePath("designer")).toBe("/designer");
    expect(workspacePath("seller")).toBe("/seller");
  });
});

describe("isWorkspace", () => {
  it("accepts valid workspaces and rejects everything else", () => {
    expect(isWorkspace("designer")).toBe(true);
    expect(isWorkspace("seller")).toBe(true);
    expect(isWorkspace("admin")).toBe(false);
    expect(isWorkspace(null)).toBe(false);
    expect(isWorkspace(undefined)).toBe(false);
  });
});

describe("isRoleAllowedForWorkspace", () => {
  it("validates designer-side roles", () => {
    expect(isRoleAllowedForWorkspace("owner", "designer")).toBe(true);
    expect(isRoleAllowedForWorkspace("editor", "designer")).toBe(true);
    expect(isRoleAllowedForWorkspace("sales", "designer")).toBe(false);
  });

  it("validates seller-side roles", () => {
    expect(isRoleAllowedForWorkspace("sales", "seller")).toBe(true);
    expect(isRoleAllowedForWorkspace("content", "seller")).toBe(true);
    expect(isRoleAllowedForWorkspace("editor", "seller")).toBe(false);
  });
});
