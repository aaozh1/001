import "server-only";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { consume } from "@/lib/rate-limit";
import { sendMail } from "@/lib/mail/mailer";

// Forgot-password flow (design 2A "reset your password"). Only the SHA-256 of
// the token ever touches the database; the raw token lives in the emailed
// link alone. Responses never reveal whether an email exists.

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function appUrl(): string {
  return (
    process.env.APP_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.AUTH_URL ??
    "http://localhost:3000"
  );
}

/** Always resolves ok (anti-enumeration); rate-limited per email. */
export async function requestPasswordReset(email: string): Promise<void> {
  const key = email.trim().toLowerCase();
  if (!consume(`pwreset:${key}`, { limit: 3, windowMs: TOKEN_TTL_MS }).allowed) return;

  const user = await prisma.user.findUnique({ where: { email: key }, select: { id: true } });
  if (!user) return;

  const raw = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  await sendMail({
    to: key,
    subject: "MatList — ตั้งรหัสผ่านใหม่ / Reset your password",
    text: `ตั้งรหัสผ่านใหม่ได้ที่ลิงก์นี้ (ใช้ได้ 1 ชั่วโมง):\n${appUrl()}/reset/${raw}\n\nถ้าคุณไม่ได้ขอรีเซ็ต ไม่ต้องทำอะไร — รหัสผ่านเดิมยังใช้ได้`,
  });
}

/** True when the token is live (exists, unused, unexpired). */
export async function isResetTokenValid(raw: string): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/.test(raw)) return false;
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(raw) },
    select: { usedAt: true, expiresAt: true },
  });
  return !!row && row.usedAt == null && row.expiresAt.getTime() > Date.now();
}

export async function resetPassword(
  raw: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: "invalid" }> {
  if (!/^[0-9a-f]{64}$/.test(raw)) return { ok: false, error: "invalid" };
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(raw) },
    select: { id: true, userId: true, usedAt: true, expiresAt: true },
  });
  if (!row || row.usedAt != null || row.expiresAt.getTime() <= Date.now()) {
    return { ok: false, error: "invalid" };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    // Any other outstanding tokens die with the reset.
    prisma.passwordResetToken.updateMany({
      where: { userId: row.userId, usedAt: null, id: { not: row.id } },
      data: { usedAt: new Date() },
    }),
  ]);
  return { ok: true };
}
