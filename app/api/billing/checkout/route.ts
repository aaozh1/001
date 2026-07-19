import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { jsonError, readJson } from "@/lib/http";
import { canManageBilling } from "@/lib/permissions";
import { getDesignerContext } from "@/lib/projects/service";
import { getSubscription } from "@/lib/billing/service";
import { paymentGateway } from "@/lib/billing/gateway";
import { isDesignerPlan, isUpgrade } from "@/lib/billing/plans";

const bodySchema = z.object({ plan: z.string(), seats: z.number().int().positive().max(200).optional() });

// POST /api/billing/checkout — begin a plan upgrade. Owner-only. Real charging
// is Phase 3.5; today the mock gateway reports payment isn't configured yet.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError("unauthorized", "Login required", 401);
  const ctx = await getDesignerContext(session.user.id);
  if (!ctx) return jsonError("forbidden", "No designer workspace", 403);
  if (!canManageBilling(ctx.role)) return jsonError("forbidden", "Owner only", 403);

  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success || !isDesignerPlan(parsed.data.plan)) {
    return jsonError("invalid_input", "Validation failed", 422);
  }

  const sub = await getSubscription(ctx.orgId);
  if (!isUpgrade(sub.plan, parsed.data.plan)) {
    return jsonError("invalid_plan", "Not an upgrade from the current plan", 422);
  }

  const result = await paymentGateway().startCheckout({
    orgId: ctx.orgId,
    plan: parsed.data.plan,
    seats: parsed.data.seats ?? sub.seats,
  });
  return NextResponse.json(result);
}
