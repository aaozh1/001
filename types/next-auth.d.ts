import type { DefaultSession } from "next-auth";
import type { Workspace } from "@/lib/permissions";

// Augment Auth.js types so the user's accessible workspaces travel on the
// session + JWT (populated in auth.ts / auth.config.ts callbacks).
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roles: Workspace[];
    } & DefaultSession["user"];
  }

  interface User {
    roles?: Workspace[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    roles?: Workspace[];
  }
}
