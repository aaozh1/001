import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/validation/auth";
import { registerUser } from "@/lib/auth/register";

// POST /api/auth/register  {email, password, role, name?}
// Consistent error shape: { error: { code, message } } (API_SPEC).
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "bad_request", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "Invalid registration input",
          issues: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 422 },
    );
  }

  const result = await registerUser(parsed.data);
  if (!result.ok) {
    return NextResponse.json(
      { error: { code: "email_taken", message: "Email already registered" } },
      { status: 409 },
    );
  }

  return NextResponse.json(
    { ok: true, userId: result.userId, orgId: result.orgId },
    { status: 201 },
  );
}
