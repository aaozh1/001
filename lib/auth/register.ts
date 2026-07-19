import { prisma } from "@/lib/db";
import { hashPassword } from "./password";
import type { RegisterInput } from "@/lib/validation/auth";

export type RegisterResult =
  | { ok: true; userId: string; orgId: string }
  | { ok: false; error: "email_taken" };

/**
 * Create a user with a personal organization of the chosen side and an owner
 * membership, all in one transaction. A free subscription is attached so the
 * org has a billing baseline. Returns email_taken if the address already exists.
 */
export async function registerUser(
  input: RegisterInput,
): Promise<RegisterResult> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) return { ok: false, error: "email_taken" };

  const passwordHash = await hashPassword(input.password);
  const displayName = input.name ?? input.email.split("@")[0];
  const orgName =
    input.role === "designer"
      ? `${displayName} Studio`
      : `${displayName} Supply`;

  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: orgName,
        type: input.role,
        subscriptions: { create: { plan: "free", seats: 1 } },
      },
    });

    const user = await tx.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        memberships: { create: { orgId: org.id, role: "owner" } },
      },
    });

    return { userId: user.id, orgId: org.id };
  });

  return { ok: true, ...result };
}
