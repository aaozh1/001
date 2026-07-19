import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

// Edge middleware built from the DB-free auth config. It enforces
// authentication (logged-in?) on the two workspace areas; role authorization
// (right workspace?) is enforced in each route-group layout, where the full
// session + DB are available.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  if (!isLoggedIn) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

// Only the workspace areas are gated; everything else (landing, auth, catalog)
// stays public.
export const config = {
  matcher: ["/designer/:path*", "/seller/:path*"],
};
