import "server-only";
import bcrypt from "bcryptjs";
import { EVENTS } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { RegisterInput } from "./schemas";

export type CreateAccountResult =
  | { ok: true; user: { id: string; email: string; name: string | null } }
  | { ok: false; error: "email_taken" };

// Create a user + their first organization + an owner membership atomically.
// Shared by the /api/auth/register route and the register server action.
export async function createAccount(
  input: RegisterInput,
): Promise<CreateAccountResult> {
  const passwordHash = await bcrypt.hash(input.password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        termsAcceptedAt: new Date(),
        memberships: {
          create: {
            role: "owner",
            org: { create: { name: input.orgName, type: input.role } },
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        memberships: { select: { orgId: true } },
      },
    });
    await track(input.role === "designer" ? EVENTS.signupDesigner : EVENTS.signupSeller, {
      userId: user.id,
      orgId: user.memberships[0]?.orgId ?? null,
    });
    return { ok: true, user: { id: user.id, email: user.email, name: user.name } };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { ok: false, error: "email_taken" };
    }
    throw err;
  }
}
