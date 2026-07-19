import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import type { SellerContext } from "@/lib/seller/context";
import type { DesignerContext } from "@/lib/projects/service";
import { rfqStatusAfterQuote, selectionOutcome } from "./logic";
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
  quoteStatus: string | null; // this seller's quote: submitted | selected | rejected
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
      quotes: { where: { sellerOrgId }, take: 1, select: { status: true } },
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
    quoteStatus: r.quotes[0]?.status ?? null,
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
    quoteStatus: q?.status ?? null,
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
  quoteId: string;
  sellerOrgId: string;
  sellerName: string;
  pricePerUnit: string;
  projectDiscount: string | null;
  leadTime: string | null;
  paymentTerms: string | null;
  validUntil: string | null;
  includeSample: boolean;
  status: string; // submitted | selected | rejected
}
export interface ItemQuoteGroup {
  rfqId: string;
  rfqStatus: string;
  quotes: ItemQuote[];
}

/** specItemId → the RFQ + quotes received, for compare/select on the designer side. */
export async function getProjectQuotes(
  orgId: string,
  projectId: string,
): Promise<Map<string, ItemQuoteGroup>> {
  const rfqs = await prisma.rFQ.findMany({
    where: { projectId, project: { orgId } },
    select: {
      id: true,
      specItemId: true,
      status: true,
      quotes: {
        orderBy: { pricePerUnit: "asc" },
        select: {
          id: true,
          pricePerUnit: true,
          projectDiscount: true,
          leadTime: true,
          paymentTerms: true,
          validUntil: true,
          includeSample: true,
          status: true,
          sellerOrgId: true,
          seller: { select: { name: true } },
        },
      },
    },
  });

  const map = new Map<string, ItemQuoteGroup>();
  for (const r of rfqs) {
    if (r.quotes.length === 0) continue;
    map.set(r.specItemId, {
      rfqId: r.id,
      rfqStatus: r.status,
      quotes: r.quotes.map((q) => ({
        quoteId: q.id,
        sellerOrgId: q.sellerOrgId,
        sellerName: q.seller.name,
        pricePerUnit: q.pricePerUnit.toString(),
        projectDiscount: q.projectDiscount ? q.projectDiscount.toString() : null,
        leadTime: q.leadTime,
        paymentTerms: q.paymentTerms,
        validUntil: q.validUntil ? q.validUntil.toISOString() : null,
        includeSample: q.includeSample,
        status: q.status,
      })),
    });
  }
  return map;
}

export type SelectQuoteResult = { ok: true } | { ok: false; error: "not_found" | "bad_quote" };

/**
 * Designer picks a winning quote: mark it `selected`, the rest `rejected`
 * (their sellers are notified in-app via that status), close the RFQ
 * `closed_won`, and confirm the winning material on the spec line — recording
 * the real chosen price. Scoped to the designer's org.
 */
export async function selectQuote(
  ctx: DesignerContext,
  rfqId: string,
  quoteId: string,
): Promise<SelectQuoteResult> {
  const rfq = await prisma.rFQ.findFirst({
    where: { id: rfqId, project: { orgId: ctx.orgId } },
    select: {
      id: true,
      specItemId: true,
      quotes: { select: { id: true, sellerOrgId: true } },
    },
  });
  if (!rfq) return { ok: false, error: "not_found" };

  const outcome = selectionOutcome(
    rfq.quotes.map((q) => q.id),
    quoteId,
  );
  if (!outcome) return { ok: false, error: "bad_quote" };

  const winner = rfq.quotes.find((q) => q.id === quoteId)!;
  // The material to confirm = the winning seller's recipient option (first).
  const recipient = await prisma.rFQRecipient.findFirst({
    where: { rfqId, sellerOrgId: winner.sellerOrgId, materialId: { not: null } },
    select: { materialId: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.quote.update({ where: { id: quoteId }, data: { status: "selected" } });
    if (outcome.rejected.length > 0) {
      await tx.quote.updateMany({
        where: { id: { in: outcome.rejected } },
        data: { status: "rejected" },
      });
    }
    await tx.rFQ.update({ where: { id: rfqId }, data: { status: "closed_won" } });

    if (recipient?.materialId) {
      await tx.specOption.updateMany({
        where: { specItemId: rfq.specItemId },
        data: { isConfirmed: false },
      });
      await tx.specOption.updateMany({
        where: { specItemId: rfq.specItemId, materialId: recipient.materialId },
        data: { isConfirmed: true },
      });
      await tx.specItem.update({
        where: { id: rfq.specItemId },
        data: { confirmedMaterialId: recipient.materialId },
      });
    }

    await writeAudit(tx, {
      orgId: ctx.orgId,
      userId: ctx.userId,
      entityType: "rfq",
      entityId: rfqId,
      action: "select",
      diff: { quoteId, rejected: outcome.rejected.length },
    });
  });
  return { ok: true };
}
