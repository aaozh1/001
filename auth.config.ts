import type { NextAuthConfig } from "next-auth";

// Edge-safe Auth.js config. This half carries NO database / bcrypt / Node-only
// imports so it can run inside middleware (Edge runtime). The Credentials
// provider that touches Prisma + bcrypt lives in auth.ts (Node runtime).
export const authConfig = {
  // Self-hosted behind our own proxy (not Vercel), so trust the deployment host
  // header. Auth.js otherwise rejects requests with UntrustedHost in production.
  // Can also be driven by the AUTH_TRUST_HOST env var; kept explicit here.
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  providers: [], // real providers are added in auth.ts
  callbacks: {
    // Copy id + workspace roles from the authorized user into the JWT once,
    // then keep them on every subsequent call.
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.roles = user.roles ?? [];
      }
      return token;
    },
    // Expose id + roles to the app via the session object.
    session({ session, token }) {
      if (typeof token.userId === "string") session.user.id = token.userId;
      session.user.roles = Array.isArray(token.roles) ? token.roles : [];
      return session;
    },
  },
} satisfies NextAuthConfig;
