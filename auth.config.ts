import type { NextAuthConfig } from "next-auth";
import type { SessionMembership } from "@/types/next-auth";

// Edge-safe base config shared by the middleware and the full auth handler.
// MUST NOT import Prisma, bcrypt, or anything Node-only — the middleware bundle
// runs on the edge runtime. Providers are added in auth.ts (Node side).
export const authConfig: NextAuthConfig = {
  // Self-hosted behind our own domain/proxy — trust the forwarded host so
  // Auth.js resolves callback URLs in production (dev trusts localhost anyway).
  // Can be overridden with AUTH_TRUST_HOST.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    // Copy identity + memberships into the token at sign-in.
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.memberships = user.memberships ?? [];
      }
      return token;
    },
    // Expose them on the session for server components / route handlers.
    // token fields are read via the JWT index signature and cast to the shapes
    // written in the jwt callback above.
    session({ session, token }) {
      const uid = token.uid as string | undefined;
      const memberships =
        (token.memberships as SessionMembership[] | undefined) ?? [];
      if (uid) session.user.id = uid;
      session.user.memberships = memberships;
      return session;
    },
  },
};
