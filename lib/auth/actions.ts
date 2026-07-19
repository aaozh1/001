"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { loginSchema, registerSchema } from "./schemas";
import { createAccount } from "./register";
import {
  defaultWorkspace,
  rolesFromMemberships,
  workspacePath,
} from "@/lib/permissions";

export type AuthFormState = { error?: string };

// Resolve where a freshly-authenticated user lands: their first workspace.
async function destinationForEmail(email: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { include: { org: { select: { type: true } } } } },
  });
  const ws = user ? defaultWorkspace(rolesFromMemberships(user.memberships)) : null;
  return ws ? workspacePath(ws) : "/";
}

export async function login(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "invalidCredentials" };

  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
  } catch (err) {
    if (err instanceof AuthError) return { error: "invalidCredentials" };
    throw err;
  }

  // Outside the try/catch: redirect() throws a control-flow signal by design.
  redirect(await destinationForEmail(parsed.data.email));
}

export async function register(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
    role: formData.get("role"),
    orgName: formData.get("orgName"),
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === "password") return { error: "passwordTooShort" };
    if (field === "email") return { error: "invalidEmail" };
    return { error: "fieldRequired" };
  }

  const result = await createAccount(parsed.data);
  if (!result.ok) return { error: "emailTaken" };

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (err) {
    if (err instanceof AuthError) return { error: "registerFailed" };
    throw err;
  }

  redirect(workspacePath(parsed.data.role));
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}
