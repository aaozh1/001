import { NextResponse } from "next/server";

// Uniform error envelope for all route handlers (API_SPEC:
// `{ error: { code, message } }`).
export function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Parse a JSON body, returning undefined on malformed input. */
export async function readJson(request: Request): Promise<unknown | undefined> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

/** 429 with a Retry-After header (rate limiting, Phase 4.3). */
export function tooManyRequests(retryAfterSec: number) {
  return NextResponse.json(
    { error: { code: "rate_limited", message: "Too many requests" } },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
  );
}

/** Best-effort client key for rate limiting (self-host behind own proxy). */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "local";
}
