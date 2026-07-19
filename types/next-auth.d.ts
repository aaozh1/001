import type { DefaultSession } from "next-auth";
import type { Side } from "@/lib/permissions/access";

// Membership summary carried in the JWT/session so route protection and
// workspace routing work without a DB round-trip on every request.
export interface SessionMembership {
  orgId: string;
  orgName: string;
  orgType: Side;
  role: string;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      memberships: SessionMembership[];
    } & DefaultSession["user"];
  }

  interface User {
    memberships?: SessionMembership[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    memberships?: SessionMembership[];
  }
}
