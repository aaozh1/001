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
