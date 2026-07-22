"use server";

import { z } from "zod";
import { isResetTokenValid, requestPasswordReset, resetPassword } from "./reset-service";

const emailSchema = z.string().trim().toLowerCase().email().max(200);
const passwordSchema = z.string().min(8).max(200);

/** Always ok — never reveals whether the email exists. */
export async function requestResetAction(rawEmail: unknown): Promise<{ ok: boolean }> {
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) return { ok: true };
  try {
    await requestPasswordReset(parsed.data);
  } catch (e) {
    console.error("requestPasswordReset failed", e);
  }
  return { ok: true };
}

export async function checkResetTokenAction(token: unknown): Promise<boolean> {
  if (typeof token !== "string") return false;
  try {
    return await isResetTokenValid(token);
  } catch {
    return false;
  }
}

export async function resetPasswordAction(
  token: unknown,
  rawPassword: unknown,
): Promise<{ ok: true } | { ok: false; error: "invalid" | "weak" }> {
  if (typeof token !== "string") return { ok: false, error: "invalid" };
  const parsed = passwordSchema.safeParse(rawPassword);
  if (!parsed.success) return { ok: false, error: "weak" };
  try {
    return await resetPassword(token, parsed.data);
  } catch (e) {
    console.error("resetPassword failed", e);
    return { ok: false, error: "invalid" };
  }
}
