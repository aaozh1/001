import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { EventName } from "./events";

// Fire-safe event tracking: analytics must NEVER break the product flow that
// emits it, so every failure is swallowed (and logged) here.

export interface TrackInput {
  orgId?: string | null;
  userId?: string | null;
  props?: Prisma.InputJsonValue;
}

export async function track(event: EventName, input: TrackInput = {}): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        event,
        orgId: input.orgId ?? null,
        userId: input.userId ?? null,
        props: input.props,
      },
    });
  } catch (err) {
    console.error(`[analytics] failed to record ${event}`, err);
  }
}
