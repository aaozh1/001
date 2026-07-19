import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema, PASSWORD_MIN } from "@/lib/auth/schemas";

describe("registerSchema", () => {
  const valid = {
    email: "  Someone@Example.com ",
    password: "supersecret",
    name: "  Somchai  ",
    role: "designer",
    orgName: "Ashram Studio",
  };

  it("accepts valid input and normalizes email + trims text", () => {
    const parsed = registerSchema.parse(valid);
    expect(parsed.email).toBe("someone@example.com");
    expect(parsed.name).toBe("Somchai");
    expect(parsed.role).toBe("designer");
  });

  it("accepts the seller role", () => {
    expect(registerSchema.parse({ ...valid, role: "seller" }).role).toBe("seller");
  });

  it("rejects an unknown role", () => {
    expect(registerSchema.safeParse({ ...valid, role: "admin" }).success).toBe(
      false,
    );
  });

  it(`rejects passwords shorter than ${PASSWORD_MIN} chars`, () => {
    const r = registerSchema.safeParse({ ...valid, password: "short" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path[0]).toBe("password");
  });

  it("rejects a malformed email", () => {
    const r = registerSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path[0]).toBe("email");
  });

  it("rejects an empty org name", () => {
    expect(registerSchema.safeParse({ ...valid, orgName: "  " }).success).toBe(
      false,
    );
  });
});

describe("loginSchema", () => {
  it("normalizes the email and requires a password", () => {
    const parsed = loginSchema.parse({ email: "A@B.CO", password: "x" });
    expect(parsed.email).toBe("a@b.co");
  });

  it("rejects an empty password", () => {
    expect(
      loginSchema.safeParse({ email: "a@b.co", password: "" }).success,
    ).toBe(false);
  });
});
