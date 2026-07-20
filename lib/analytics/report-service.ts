import "server-only";
import { prisma } from "@/lib/db";
import {
  DESIGNER_FUNNEL,
  SELLER_FUNNEL,
  type FunnelStep,
  computeFunnel,
  countEvents,
} from "./events";

// Ops metrics report (Phase 4.2): both funnels + raw event counts over a
// window. Operator-only surface — gated by the OPS_EMAILS allowlist upstream.

export interface MetricsReport {
  days: number;
  totalEvents: number;
  designerFunnel: FunnelStep[];
  sellerFunnel: FunnelStep[];
  topEvents: { event: string; count: number }[];
}

export async function getMetricsReport(days = 30): Promise<MetricsReport> {
  const since = new Date(Date.now() - days * 24 * 3600 * 1000);
  const rows = await prisma.analyticsEvent.findMany({
    where: { createdAt: { gte: since } },
    select: { event: true, orgId: true },
  });

  const topEvents = [...countEvents(rows).entries()]
    .map(([event, count]) => ({ event, count }))
    .sort((a, b) => b.count - a.count);

  return {
    days,
    totalEvents: rows.length,
    designerFunnel: computeFunnel(rows, DESIGNER_FUNNEL),
    sellerFunnel: computeFunnel(rows, SELLER_FUNNEL),
    topEvents,
  };
}

/** Is this email allowed into the ops surface? (OPS_EMAILS: comma-separated.) */
export function isOpsEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = (process.env.OPS_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}
