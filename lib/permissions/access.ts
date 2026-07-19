// Pure access-control logic for the two-sided workspace. Kept free of any
// framework/DB imports so it is unit-testable (see access.test.ts) and safe to
// import from edge middleware. Business rule: designers and sellers have
// separate workspaces; a single user MAY hold memberships on both sides
// (ARCHITECTURE decision #3), but each workspace is gated by side.

export type Side = "designer" | "seller";

// Roles allowed on each side (DATA_MODEL / workspace spec). `owner` is shared.
export const DESIGNER_ROLES = ["owner", "editor", "viewer"] as const;
export const SELLER_ROLES = ["owner", "manager", "sales", "content"] as const;

export type DesignerRole = (typeof DESIGNER_ROLES)[number];
export type SellerRole = (typeof SELLER_ROLES)[number];
export type Role = DesignerRole | SellerRole;

/** Minimal membership shape the access checks need. */
export interface AccessMembership {
  orgType: Side;
  role?: string;
}

/** Which workspace side a path belongs to, or null for public paths. */
export function workspaceSideFromPath(pathname: string): Side | null {
  if (pathname === "/designer" || pathname.startsWith("/designer/")) {
    return "designer";
  }
  if (pathname === "/seller" || pathname.startsWith("/seller/")) {
    return "seller";
  }
  return null;
}

/** True if the user has at least one membership on the given side. */
export function hasSide(
  memberships: readonly AccessMembership[] | undefined | null,
  side: Side,
): boolean {
  if (!memberships) return false;
  return memberships.some((m) => m.orgType === side);
}

/**
 * Where to send a user after login. Prefer the designer workspace when the
 * user has both; fall back to seller; `/` when they have neither (shouldn't
 * happen after registration, but handled defensively).
 */
export function defaultWorkspacePath(
  memberships: readonly AccessMembership[] | undefined | null,
): "/designer" | "/seller" | "/" {
  if (hasSide(memberships, "designer")) return "/designer";
  if (hasSide(memberships, "seller")) return "/seller";
  return "/";
}

/** Is this role valid for the given side? */
export function isRoleValidForSide(role: string, side: Side): boolean {
  const roles: readonly string[] =
    side === "designer" ? DESIGNER_ROLES : SELLER_ROLES;
  return roles.includes(role);
}
