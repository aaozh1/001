import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/auth/schemas";
import { rolesFromMemberships } from "@/lib/permissions";

// Google OAuth is env-gated: without credentials the provider (and its login
// button) simply doesn't exist. Google can only sign IN to accounts that were
// registered here first — workspaces/roles are created by /register, so an
// unknown Google email is bounced to registration instead of half-created.
export const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

// Full Auth.js instance (Node runtime). Runs in Route Handlers + Server
// Components + Server Actions. Middleware must import auth.config.ts instead.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      if (!user.email) return false;
      const existing = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true },
      });
      return existing ? true : "/register?error=google_no_account";
    },
    async jwt({ token, user, account }) {
      // Google users carry no roles on the OAuth profile — load them from the
      // workspace memberships the account was registered with.
      if (account?.provider === "google" && user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { memberships: { include: { org: { select: { type: true } } } } },
        });
        if (dbUser) {
          token.userId = dbUser.id;
          token.roles = rolesFromMemberships(dbUser.memberships);
        }
        return token;
      }
      if (user) {
        token.userId = user.id;
        token.roles = user.roles ?? [];
      }
      return token;
    },
  },
  providers: [
    ...(googleEnabled ? [Google] : []),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { memberships: { include: { org: { select: { type: true } } } } },
        });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: rolesFromMemberships(user.memberships),
        };
      },
    }),
  ],
});
