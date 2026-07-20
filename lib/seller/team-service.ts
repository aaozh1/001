import "server-only";
import { prisma } from "@/lib/db";
import { isRoleAllowedForWorkspace } from "@/lib/permissions";
import type { SellerContext } from "@/lib/seller/context";

// Admin console (ROADMAP 3.4): owner manages the seller org's team + roles.
// Guard rails: role names validated against the seller side, and the org can
// never lose its last owner (that would orphan billing + admin itself).

export interface TeamMember {
  userId: string;
  name: string | null;
  email: string;
  role: string;
  isSelf: boolean;
}

export async function listTeam(orgId: string, selfUserId: string): Promise<TeamMember[]> {
  const rows = await prisma.membership.findMany({
    where: { orgId },
    orderBy: { user: { createdAt: "asc" } },
    select: { role: true, user: { select: { id: true, name: true, email: true } } },
  });
  return rows.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    isSelf: m.user.id === selfUserId,
  }));
}

type TeamError =
  | "invalid_role"
  | "not_member"
  | "last_owner"
  | "user_not_found"
  | "already_member";
export type TeamResult = { ok: true } | { ok: false; error: TeamError };

async function ownerCount(orgId: string): Promise<number> {
  return prisma.membership.count({ where: { orgId, role: "owner" } });
}

export async function changeMemberRole(
  ctx: SellerContext,
  targetUserId: string,
  role: string,
): Promise<TeamResult> {
  if (!isRoleAllowedForWorkspace(role, "seller")) {
    return { ok: false, error: "invalid_role" };
  }
  const membership = await prisma.membership.findFirst({
    where: { orgId: ctx.orgId, userId: targetUserId },
    select: { id: true, role: true },
  });
  if (!membership) return { ok: false, error: "not_member" };

  // Never demote the org's last owner.
  if (membership.role === "owner" && role !== "owner") {
    if ((await ownerCount(ctx.orgId)) <= 1) return { ok: false, error: "last_owner" };
  }

  await prisma.membership.update({ where: { id: membership.id }, data: { role } });
  return { ok: true };
}

/** Add an EXISTING MatList user to the org by email (invite flow comes later). */
export async function addMemberByEmail(
  ctx: SellerContext,
  email: string,
  role: string,
): Promise<TeamResult> {
  if (!isRoleAllowedForWorkspace(role, "seller")) {
    return { ok: false, error: "invalid_role" };
  }
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true },
  });
  if (!user) return { ok: false, error: "user_not_found" };

  const existing = await prisma.membership.findFirst({
    where: { orgId: ctx.orgId, userId: user.id },
    select: { id: true },
  });
  if (existing) return { ok: false, error: "already_member" };

  await prisma.membership.create({
    data: { orgId: ctx.orgId, userId: user.id, role },
  });
  return { ok: true };
}

export async function removeMember(
  ctx: SellerContext,
  targetUserId: string,
): Promise<TeamResult> {
  const membership = await prisma.membership.findFirst({
    where: { orgId: ctx.orgId, userId: targetUserId },
    select: { id: true, role: true },
  });
  if (!membership) return { ok: false, error: "not_member" };
  if (membership.role === "owner" && (await ownerCount(ctx.orgId)) <= 1) {
    return { ok: false, error: "last_owner" };
  }
  await prisma.membership.delete({ where: { id: membership.id } });
  return { ok: true };
}
