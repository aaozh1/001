import "server-only";
import bcrypt from "bcryptjs";
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
        memberships: {
          create: {
            role: "owner",
            org: { create: { name: input.orgName, type: input.role } },
          },
        },
      },
      select: { id: true, email: true, name: true },
    });
    return { ok: true, user };
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
