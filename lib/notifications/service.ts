import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// In-app notifications (กระดิ่ง). Rows are fanned out PER USER at creation so
// read-state is personal. Creation is fire-safe: a notification must never
// break the business action it decorates.

export type NotificationType =
  | "rfq_new"
  | "quote_in"
  | "quote_won"
  | "chat_new"
  | "share_feedback";

export interface NotificationView {
  id: string;
  type: string;
  payload: Record<string, string | number> | null;
  href: string | null;
  read: boolean;
  createdAt: string;
}

/** Fan a notification out to every member of an org (minus the actor). */
export async function notifyOrg(
  orgId: string,
  input: {
    type: NotificationType;
    payload?: Record<string, string | number>;
    href?: string;
  },
  excludeUserId?: string,
): Promise<void> {
  try {
    const members = await prisma.membership.findMany({
      where: { orgId, ...(excludeUserId ? { userId: { not: excludeUserId } } : {}) },
      select: { userId: true },
    });
    if (members.length === 0) return;
    await prisma.notification.createMany({
      data: members.map((m) => ({
        userId: m.userId,
        type: input.type,
        payload: (input.payload ?? null) as Prisma.InputJsonValue,
        href: input.href ?? null,
      })),
    });
  } catch (e) {
    // Fire-safe by contract.
    console.error("notifyOrg failed", e);
  }
}

export async function listNotifications(
  userId: string,
  limit = 20,
): Promise<{ items: NotificationView[]; unread: number }> {
  const [rows, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return {
    items: rows.map((r) => ({
      id: r.id,
      type: r.type,
      payload: (r.payload ?? null) as Record<string, string | number> | null,
      href: r.href,
      read: r.readAt != null,
      createdAt: r.createdAt.toISOString(),
    })),
    unread,
  };
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markRead(userId: string, id: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { id, userId },
    data: { readAt: new Date() },
  });
}
