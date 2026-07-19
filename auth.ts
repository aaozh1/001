import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/validation/auth";
import type { SessionMembership } from "@/types/next-auth";
import type { Side } from "@/lib/permissions/access";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { memberships: { include: { org: true } } },
        });
        if (!user?.passwordHash) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        const memberships: SessionMembership[] = user.memberships.map((m) => ({
          orgId: m.orgId,
          orgName: m.org.name,
          orgType: m.org.type as Side,
          role: m.role,
        }));

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          memberships,
        };
      },
    }),
  ],
});
