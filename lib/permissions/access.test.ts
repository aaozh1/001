import { describe, it, expect } from "vitest";
import {
  workspaceSideFromPath,
  hasSide,
  defaultWorkspacePath,
  isRoleValidForSide,
  type AccessMembership,
} from "./access";

const designer: AccessMembership = { orgType: "designer", role: "owner" };
const seller: AccessMembership = { orgType: "seller", role: "owner" };

describe("workspaceSideFromPath", () => {
  it("maps /designer and its subpaths to designer", () => {
    expect(workspaceSideFromPath("/designer")).toBe("designer");
    expect(workspaceSideFromPath("/designer/projects/123")).toBe("designer");
  });

  it("maps /seller and its subpaths to seller", () => {
    expect(workspaceSideFromPath("/seller")).toBe("seller");
    expect(workspaceSideFromPath("/seller/materials")).toBe("seller");
  });

  it("returns null for public paths", () => {
    expect(workspaceSideFromPath("/")).toBeNull();
    expect(workspaceSideFromPath("/login")).toBeNull();
    expect(workspaceSideFromPath("/catalog")).toBeNull();
  });

  it("does not treat lookalike prefixes as protected", () => {
    // "/designerish" must NOT match "/designer"
    expect(workspaceSideFromPath("/designerish")).toBeNull();
    expect(workspaceSideFromPath("/sellers-guide")).toBeNull();
  });
});

describe("hasSide", () => {
  it("detects the presence of a side", () => {
    expect(hasSide([designer], "designer")).toBe(true);
    expect(hasSide([designer], "seller")).toBe(false);
    expect(hasSide([designer, seller], "seller")).toBe(true);
  });

  it("handles empty/undefined memberships", () => {
    expect(hasSide([], "designer")).toBe(false);
    expect(hasSide(undefined, "designer")).toBe(false);
    expect(hasSide(null, "seller")).toBe(false);
  });
});

describe("defaultWorkspacePath", () => {
  it("prefers designer when present", () => {
    expect(defaultWorkspacePath([designer])).toBe("/designer");
    expect(defaultWorkspacePath([designer, seller])).toBe("/designer");
  });

  it("falls back to seller", () => {
    expect(defaultWorkspacePath([seller])).toBe("/seller");
  });

  it("returns / when the user has no memberships", () => {
    expect(defaultWorkspacePath([])).toBe("/");
    expect(defaultWorkspacePath(undefined)).toBe("/");
  });
});

describe("isRoleValidForSide", () => {
  it("accepts side-appropriate roles", () => {
    expect(isRoleValidForSide("editor", "designer")).toBe(true);
    expect(isRoleValidForSide("owner", "designer")).toBe(true);
    expect(isRoleValidForSide("sales", "seller")).toBe(true);
    expect(isRoleValidForSide("owner", "seller")).toBe(true);
  });

  it("rejects cross-side roles", () => {
    expect(isRoleValidForSide("editor", "seller")).toBe(false);
    expect(isRoleValidForSide("sales", "designer")).toBe(false);
    expect(isRoleValidForSide("nonsense", "designer")).toBe(false);
  });
});
