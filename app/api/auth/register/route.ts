import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/auth/schemas";
import { createAccount } from "@/lib/auth/register";

// POST /api/auth/register — create a user + their first organization + owner
// membership. The org's `type` (designer|seller) is the user's workspace side
// (ARCHITECTURE decision #3: role split lives at auth). Error shape follows
// API_SPEC: { error: { code, message } }.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_json", message: "Malformed request body" } },
      { status: 400 },
    );
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_input", message: "Validation failed" } },
      { status: 422 },
    );
  }

  const result = await createAccount(parsed.data);
  if (!result.ok) {
    return NextResponse.json(
      { error: { code: "email_taken", message: "Email already registered" } },
      { status: 409 },
    );
  }

  return NextResponse.json({ user: result.user }, { status: 201 });
}
