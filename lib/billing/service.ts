import "server-only";
import { prisma } from "@/lib/db";
import { type DesignerPlan, isDesignerPlan } from "./plans";

// Reads the org's billing state. An org with no Subscription row is implicitly
// on Free — the backbone works without anyone ever touching billing.

export interface CurrentSubscription {
  plan: DesignerPlan;
  seats: number;
  currentPeriodEnd: string | null;
}

export async function getSubscription(orgId: string): Promise<CurrentSubscription> {
  const sub = await prisma.subscription.findFirst({
    where: { orgId },
    select: { plan: true, seats: true, currentPeriodEnd: true },
  });
  if (!sub || !isDesignerPlan(sub.plan)) {
    return { plan: "free", seats: 1, currentPeriodEnd: null };
  }
  return {
    plan: sub.plan,
    seats: sub.seats,
    currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
  };
}

export interface InvoiceRow {
  id: string;
  amount: string;
  taxInvoiceUrl: string | null;
  issuedAt: string;
}

export async function listInvoices(orgId: string): Promise<InvoiceRow[]> {
  const rows = await prisma.invoice.findMany({
    where: { orgId },
    orderBy: { issuedAt: "desc" },
    select: { id: true, amount: true, taxInvoiceUrl: true, issuedAt: true },
  });
  return rows.map((r) => ({
    id: r.id,
    amount: r.amount.toString(),
    taxInvoiceUrl: r.taxInvoiceUrl,
    issuedAt: r.issuedAt.toISOString(),
  }));
}
