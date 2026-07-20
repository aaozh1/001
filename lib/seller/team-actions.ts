"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { getSellerContext } from "@/lib/seller/context";
import { addMemberByEmail, changeMemberRole, removeMember } from "./team-service";

export type TeamActionResult = { ok: boolean; error?: string };

// Admin console is OWNER-only — roles decide who can quote/edit the catalog,
// so handing this to managers would let them escalate themselves.
async function ownerContext() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const ctx = await getSellerContext(session.user.id);
  if (!ctx || ctx.role !== "owner") return null;
  return ctx;
}

const roleSchema = z.string().trim().min(1).max(20);
const emailSchema = z.string().trim().toLowerCase().email();

export async function changeMemberRoleAction(
  targetUserId: string,
  role: string,
): Promise<TeamActionResult> {
  const ctx = await ownerContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  const parsedRole = roleSchema.safeParse(role);
  if (!parsedRole.success) return { ok: false, error: "invalid_role" };

  const result = await changeMemberRole(ctx, targetUserId, parsedRole.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/seller/team");
  return { ok: true };
}

export async function addMemberAction(
  email: string,
  role: string,
): Promise<TeamActionResult> {
  const ctx = await ownerContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  const parsedEmail = emailSchema.safeParse(email);
  const parsedRole = roleSchema.safeParse(role);
  if (!parsedEmail.success || !parsedRole.success) {
    return { ok: false, error: "invalid" };
  }

  const result = await addMemberByEmail(ctx, parsedEmail.data, parsedRole.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/seller/team");
  return { ok: true };
}

export async function removeMemberAction(targetUserId: string): Promise<TeamActionResult> {
  const ctx = await ownerContext();
  if (!ctx) return { ok: false, error: "forbidden" };

  const result = await removeMember(ctx, targetUserId);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/seller/team");
  return { ok: true };
}
