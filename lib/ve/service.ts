import "server-only";
import { prisma } from "@/lib/db";
import type { DesignerContext } from "@/lib/projects/service";
import { getSubscription } from "@/lib/billing/service";
import { planIncludes } from "@/lib/billing/plans";
import { writeAudit } from "@/lib/audit";
import { EVENTS } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { type MaterialSummary, getMaterialsByIds } from "@/lib/materials/service";
import { rankVeCandidates } from "./logic";

// VE Finder (Pro gate per ROADMAP): cheaper same-category alternatives for a
// CONFIRMED line, ranked by spec similarity — never by seller identity/money.

export interface VeSuggestion {
  material: MaterialSummary;
  savingPercent: number;
  similarity: number;
}

export type VeResult =
  | { ok: true; base: MaterialSummary; suggestions: VeSuggestion[] }
  | { ok: false; error: "gated" | "not_found" | "no_confirmed" | "no_price" };

export async function findVeAlternatives(
  ctx: DesignerContext,
  itemId: string,
): Promise<VeResult> {
  const sub = await getSubscription(ctx.orgId);
  if (!planIncludes(sub.plan, "ve_finder")) return { ok: false, error: "gated" };

  const item = await prisma.specItem.findFirst({
    where: { id: itemId, project: { orgId: ctx.orgId } },
    select: { confirmedMaterialId: true },
  });
  if (!item) return { ok: false, error: "not_found" };
  if (!item.confirmedMaterialId) return { ok: false, error: "no_confirmed" };

  const baseMap = await getMaterialsByIds([item.confirmedMaterialId]);
  const base = baseMap.get(item.confirmedMaterialId);
  if (!base) return { ok: false, error: "not_found" };
  if (!base.price) return { ok: false, error: "no_price" };
  const basePrice = Number(base.price);

  // Candidate pool: published, same category, priced below base.
  const rows = await prisma.material.findMany({
    where: {
      status: "published",
      category: base.category,
      id: { not: base.id },
      price: { not: null, lt: basePrice },
    },
    select: {
      id: true, price: true, unit: true, spec: true, cert: true,
      warranty: true, leadTime: true, size: true, completeness: true,
    },
    take: 500,
  });

  const specOf = (spec: unknown): string | null => {
    if (spec && typeof spec === "object" && !Array.isArray(spec)) {
      const v = (spec as Record<string, unknown>).summary_th;
      return typeof v === "string" ? v : null;
    }
    return null;
  };

  const ranked = rankVeCandidates(
    {
      price: basePrice,
      unit: base.unit,
      specText: base.specTh,
      cert: base.cert,
      warranty: base.warranty,
      leadTime: base.leadTime,
      size: base.size,
    },
    rows.map((r) => ({
      id: r.id,
      price: Number(r.price),
      unit: r.unit,
      specText: specOf(r.spec),
      cert: r.cert,
      warranty: r.warranty,
      leadTime: r.leadTime,
      size: r.size,
      completeness: r.completeness,
    })),
  );

  const summaries = await getMaterialsByIds(ranked.map((r) => r.id));
  await track(EVENTS.veSearched, { orgId: ctx.orgId, userId: ctx.userId });
  return {
    ok: true,
    base,
    suggestions: ranked
      .map((r) => {
        const material = summaries.get(r.id);
        return material
          ? { material, savingPercent: r.savingPercent, similarity: r.similarity }
          : null;
      })
      .filter((s): s is VeSuggestion => s !== null),
  };
}

/** Record a VE swap decision (history is append-only per DATA_MODEL). */
export async function recordVeSwap(
  ctx: DesignerContext,
  itemId: string,
  fromMaterialId: string,
  toMaterialId: string,
  savedPercent: number,
): Promise<boolean> {
  const item = await prisma.specItem.findFirst({
    where: { id: itemId, project: { orgId: ctx.orgId } },
    select: { id: true, projectId: true },
  });
  if (!item) return false;
  await prisma.$transaction(async (tx) => {
    await tx.vEHistory.create({
      data: { specItemId: itemId, fromMaterialId, toMaterialId, savedPercent },
    });
    await writeAudit(tx, {
      orgId: ctx.orgId,
      userId: ctx.userId,
      entityType: "spec_item",
      entityId: itemId,
      action: "ve_swap",
      diff: { fromMaterialId, toMaterialId, savedPercent },
    });
  });
  await track(EVENTS.veSwapped, { orgId: ctx.orgId, userId: ctx.userId });
  return true;
}
