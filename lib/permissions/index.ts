// Permission / workspace-access logic — pure functions, unit-tested (see
// permissions.test.ts). CLAUDE.md requires tests for "การคิดสิทธิ์ผู้ใช้".
//
// A "workspace" maps 1:1 to an Organization type (designer | seller). A single
// user may belong to orgs of both types (ARCHITECTURE decision #3: "ผู้ใช้คนเดียว
// อาจมีทั้งสอง role ได้ แต่ workspace แยกกัน"), so access is derived from the set
// of org types the user is a member of — not a single field on the user.

export const WORKSPACES = ["designer", "seller"] as const;
export type Workspace = (typeof WORKSPACES)[number];

// Membership roles allowed on each side (docs/DATA_MODEL.md → Membership.role).
// `owner` is shared by both sides.
export const WORKSPACE_ROLES = {
  designer: ["owner", "editor", "viewer"],
  seller: ["owner", "manager", "sales", "content"],
} as const satisfies Record<Workspace, readonly string[]>;

export type DesignerRole = (typeof WORKSPACE_ROLES.designer)[number];
export type SellerRole = (typeof WORKSPACE_ROLES.seller)[number];
export type MembershipRole = DesignerRole | SellerRole;

export function isWorkspace(value: unknown): value is Workspace {
  return typeof value === "string" && (WORKSPACES as readonly string[]).includes(value);
}

/** Distinct workspaces a user can reach, from their org memberships. */
export function rolesFromMemberships(
  memberships: readonly { org: { type: string } }[],
): Workspace[] {
  const seen = new Set<Workspace>();
  for (const m of memberships) {
    if (isWorkspace(m.org.type)) seen.add(m.org.type);
  }
  // Stable, canonical order (designer before seller).
  return WORKSPACES.filter((w) => seen.has(w));
}

/** Can a user with these workspace roles enter the given workspace? */
export function canAccessWorkspace(
  roles: readonly Workspace[],
  workspace: Workspace,
): boolean {
  return roles.includes(workspace);
}

/** Where to send a user after login: their first accessible workspace, if any. */
export function defaultWorkspace(roles: readonly Workspace[]): Workspace | null {
  return WORKSPACES.find((w) => roles.includes(w)) ?? null;
}

/** URL prefix for a workspace. Route groups (designer)/(seller) share no URL
 *  segments, so each workspace gets its own path prefix. */
export function workspacePath(workspace: Workspace): string {
  return `/${workspace}`;
}

/** Is a membership role valid for a given workspace side? */
export function isRoleAllowedForWorkspace(
  role: string,
  workspace: Workspace,
): role is MembershipRole {
  return (WORKSPACE_ROLES[workspace] as readonly string[]).includes(role);
}

// Designer-side roles that may create/edit/duplicate/archive/delete projects.
// `viewer` is read-only (docs/DATA_MODEL Membership.role).
export const PROJECT_MANAGER_ROLES = ["owner", "editor"] as const;

/** Can a member with this designer-side role mutate projects? */
export function canManageProjects(role: string): boolean {
  return (PROJECT_MANAGER_ROLES as readonly string[]).includes(role);
}

// Only the org owner controls billing (plan changes, tax-invoice details). A
// mis-billed office is a hard problem, so this stays tighter than project edit.
export function canManageBilling(role: string): boolean {
  return role === "owner";
}
