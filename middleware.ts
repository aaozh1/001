import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";
import {
  workspaceSideFromPath,
  hasSide,
  defaultWorkspacePath,
  type Side,
} from "@/lib/permissions/access";
import type { SessionMembership } from "@/types/next-auth";

const { auth } = NextAuth(authConfig);

// Protects the two workspaces:
//  - not logged in           → /login?callbackUrl=…
//  - logged in, wrong side   → their own default workspace
//  - logged in, right side   → allowed through
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const side: Side | null = workspaceSideFromPath(pathname);
  if (!side) return NextResponse.next();

  const user = req.auth?.user;
  if (!user) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  const memberships = (user.memberships ?? []) as SessionMembership[];
  if (!hasSide(memberships, side)) {
    return NextResponse.redirect(
      new URL(defaultWorkspacePath(memberships), req.nextUrl.origin),
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/designer/:path*", "/seller/:path*"],
};
