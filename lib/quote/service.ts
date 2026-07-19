import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import type { SellerContext } from "@/lib/seller/context";
import { rfqStatusAfterQuote } from "./logic";
import type { QuoteInput } from "./schemas";

// ── Seller: RFQ inbox + detail ─────────────────────────────────────────
// Everything a seller reads is privacy-safe (no designer contact, rule #4).

export interface SellerInboxRfq {
  id: string;
  projectName: string;
  zone: string | null;
  category: string | null;
  qty: string | null;
  qtyUnit: string | null;
  wantSample: boolean;
  slaDueAt: string | null;
  status: string;
  responded: boolean;
  materials: { materialId: string; name: string }[];
}

export async function listSellerInbox(sellerOrgId: string): Promise<SellerInboxRfq[]> {
  const rows = await prisma.rFQ.findMany({
    where: { recipients: { some: { sellerOrgId } } },
    orderBy: { slaDueAt: "asc" },
    select: {
      id: true,
      wantSample: true,
      slaDueAt: true,
      status: true,
      project: { select: { name: true } },
      specItem: { select: { zone: true, category: true, qty: true, qtyUnit: true } },
      recipients: {
        where: { sellerOrgId },
        select: {
          materialId: true,
          respondedAt: true,
          material: { select: { nameTh: true } },
        },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    projectName: r.project.name,
    zone: r.specItem.zone,
    category: r.specItem.category,
    qty: r.specItem.qty != null ? String(r.specItem.qty) : null,
    qtyUnit: r.specItem.qtyUnit,
    wantSample: r.wantSample,
    slaDueAt: r.slaDueAt ? r.slaDueAt.toISOString() : null,
    status: r.status,
    responded: r.recipients.some((rc) => rc.respondedAt != null),
    materials: r.recipients.map((rc) => ({
      materialId: rc.materialId ?? "",
      name: rc.material?.nameTh ?? "—",
    })),
  }));
}

export interface SellerRfqDetail extends SellerInboxRfq {
  note: string | null;
  existingQuote: {
    pricePerUnit: string;
    projectDiscount: string | null;
    leadTime: string | null;
    paymentTerms: string | null;
    validUntil: string | null;
    includeSample: boolean;
    status: string;
  } | null;
}

/** Detail for one RFQ, scoped to a seller that actually received it. */
export async function getSellerRfqDetail(
  sellerOrgId: string,
  rfqId: string,
): Promise<SellerRfqDetail | null> {
  const r = await prisma.rFQ.findFirst({
    where: { id: rfqId, recipients: { some: { sellerOrgId } } },
    select: {
      id: true,
      note: true,
      wantSample: true,
      slaDueAt: true,
      status: true,
      project: { select: { name: true } },
      specItem: { select: { zone: true, category: true, qty: true, qtyUnit: true } },
      recipients: {
        where: { sellerOrgId },
        select: { materialId: true, respondedAt: true, material: { select: { nameTh: true } } },
      },
      quotes: { where: { sellerOrgId }, take: 1, orderBy: { createdAt: "desc" } },
    },
  });
  if (!r) return null;

  const q = r.quotes[0] ?? null;
  return {
    id: r.id,
    projectName: r.project.name,
    zone: r.specItem.zone,
    category: r.specItem.category,
    qty: r.specItem.qty != null ? String(r.specItem.qty) : null,
    qtyUnit: r.specItem.qtyUnit,
    wantSample: r.wantSample,
    slaDueAt: r.slaDueAt ? r.slaDueAt.toISOString() : null,
    status: r.status,
    responded: r.recipients.some((rc) => rc.respondedAt != null),
    materials: r.recipients.map((rc) => ({
      materialId: rc.materialId ?? "",
      name: rc.material?.nameTh ?? "—",
    })),
    note: r.note,
    existingQuote: q
      ? {
          pricePerUnit: q.pricePerUnit.toString(),
          projectDiscount: q.projectDiscount ? q.projectDiscount.toString() : null,
          leadTime: q.leadTime,
          paymentTerms: q.paymentTerms,
          validUntil: q.validUntil ? q.validUntil.toISOString() : null,
          includeSample: q.includeSample,
          status: q.status,
        }
      : null,
  };
}

export type SubmitQuoteResult = { ok: true } | { ok: false; error: "not_recipient" };

/**
 * Seller answers an RFQ: upsert their Quote, flip the RFQ to `quoted`, and stamp
 * the recipient responded. The quoted price flows back to the designer via the
 * RFQ/quote relations (see getProjectQuotes). Idempotent per (rfq, seller).
 */
export async function submitQuote(
  ctx: SellerContext,
  rfqId: string,
  input: QuoteInput,
  now: Date,
): Promise<SubmitQuoteResult> {
  const rfq = await prisma.rFQ.findFirst({
    where: { id: rfqId, recipients: { some: { sellerOrgId: ctx.orgId } } },
    select: { id: true, status: true, quotes: { where: { sellerOrgId: ctx.orgId }, select: { id: true } } },
  });
  if (!rfq) return { ok: false, error: "not_recipient" };

  const data = {
    pricePerUnit: new Prisma.Decimal(input.pricePerUnit),
    projectDiscount:
      input.projectDiscount != null ? new Prisma.Decimal(input.projectDiscount) : null,
    leadTime: input.leadTime ?? null,
    paymentTerms: input.paymentTerms ?? null,
    validUntil: input.validUntil ? new Date(input.validUntil) : null,
    includeSample: input.includeSample ?? false,
  };

  await prisma.$transaction(async (tx) => {
    const existing = rfq.quotes[0];
    if (existing) {
      await tx.quote.update({ where: { id: existing.id }, data });
    } else {
      await tx.quote.create({ data: { rfqId, sellerOrgId: ctx.orgId, ...data } });
    }
    await tx.rFQ.update({
      where: { id: rfqId },
      data: { status: rfqStatusAfterQuote(rfq.status) as Prisma.RFQUpdateInput["status"] },
    });
    await tx.rFQRecipient.updateMany({
      where: { rfqId, sellerOrgId: ctx.orgId },
      data: { respondedAt: now },
    });
    await writeAudit(tx, {
      orgId: ctx.orgId,
      userId: ctx.userId,
      entityType: "quote",
      entityId: rfqId,
      action: existing ? "update" : "create",
      diff: { pricePerUnit: input.pricePerUnit },
    });
  });
  return { ok: true };
}

// ── Designer: quotes flowing back into the schedule ────────────────────

export interface ItemQuote {
  sellerName: string;
  pricePerUnit: string;
  projectDiscount: string | null;
  leadTime: string | null;
  validUntil: string | null;
  includeSample: boolean;
}

/** specItemId → quotes received, for showing returned prices to the designer. */
export async function getProjectQuotes(
  orgId: string,
  projectId: string,
): Promise<Map<string, ItemQuote[]>> {
  const rfqs = await prisma.rFQ.findMany({
    where: { projectId, project: { orgId } },
    select: {
      specItemId: true,
      quotes: {
        orderBy: { pricePerUnit: "asc" },
        select: {
          pricePerUnit: true,
          projectDiscount: true,
          leadTime: true,
          validUntil: true,
          includeSample: true,
          seller: { select: { name: true } },
        },
      },
    },
  });

  const map = new Map<string, ItemQuote[]>();
  for (const r of rfqs) {
    if (r.quotes.length === 0) continue;
    map.set(
      r.specItemId,
      r.quotes.map((q) => ({
        sellerName: q.seller.name,
        pricePerUnit: q.pricePerUnit.toString(),
        projectDiscount: q.projectDiscount ? q.projectDiscount.toString() : null,
        leadTime: q.leadTime,
        validUntil: q.validUntil ? q.validUntil.toISOString() : null,
        includeSample: q.includeSample,
      })),
    );
  }
  return map;
}
