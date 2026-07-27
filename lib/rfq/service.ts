import "server-only";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { EVENTS } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { notifyOrg } from "@/lib/notifications/service";
import { computeDedupKey, creditCostFor } from "@/lib/billing/engagement";
import type { DesignerContext } from "@/lib/projects/service";
import {
  computeSlaDueAt,
  dedupeRecipients,
  toSellerRfqView,
  type DesignerRfqRecord,
  type SellerRfqView,
} from "./logic";

export interface SendRfqInput {
  specItemIds: string[];
  deadline: Date | null;
  note: string | null;
  wantSample: boolean;
}

export interface SendRfqResult {
  created: number;
  skipped: number;
  recipients: number;
}

/**
 * Create one RFQ per selected spec line, with a recipient per material option
 * (its seller). Items with no options, or that already have a live RFQ, are
 * skipped. Recipients are delivered `in_app` here; LINE/email (with the PDPA
 * human-review gate) is Phase 2.2.
 */
export async function sendRfqs(
  ctx: DesignerContext,
  input: SendRfqInput,
  now: Date,
): Promise<SendRfqResult> {
  const items = await prisma.specItem.findMany({
    where: { id: { in: input.specItemIds }, project: { orgId: ctx.orgId } },
    select: {
      id: true,
      projectId: true,
      options: { select: { materialId: true, material: { select: { sellerOrgId: true } } } },
      // Live or already-won RFQs block a re-send. closed_lost/expired lines may
      // legitimately go out again, but a won line is settled — re-sending it
      // would spam sellers with a lead that no longer exists.
      rfqs: {
        where: { status: { in: ["open", "quoted", "closed_won"] } },
        select: { id: true },
      },
    },
  });

  const slaDueAt = computeSlaDueAt(now, input.deadline);
  let created = 0;
  let skipped = 0;
  let recipientCount = 0;
  const notifiedSellerOrgs = new Set<string>();
  // Phase 5 (inert): collect quote_request engagement rows to record AFTER the
  // RFQ commits — a best-effort ledger, so it can never break the RFQ send.
  const engagementRows: {
    type: "quote_request";
    designerOrgId: string;
    sellerOrgId: string;
    specItemId: string;
    materialId: string | null;
    rfqId: string;
    creditCost: number;
    dedupKey: string;
  }[] = [];

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      if (item.options.length === 0 || item.rfqs.length > 0) {
        skipped++;
        continue;
      }
      // Re-check inside the transaction: two concurrent sends both pass the
      // pre-fetch above; without this, each would create its own RFQ and
      // sellers would receive duplicate leads for the same line.
      const live = await tx.rFQ.count({
        where: {
          specItemId: item.id,
          status: { in: ["open", "quoted", "closed_won"] },
        },
      });
      if (live > 0) {
        skipped++;
        continue;
      }
      const recipients = dedupeRecipients(
        item.options.map((o) => ({
          materialId: o.materialId,
          sellerOrgId: o.material.sellerOrgId,
        })),
      );

      const rfq = await tx.rFQ.create({
        data: {
          specItemId: item.id,
          projectId: item.projectId,
          createdById: ctx.userId,
          deadline: input.deadline,
          note: input.note,
          wantSample: input.wantSample,
          slaDueAt,
          status: "open",
          recipients: {
            create: recipients.map((r) => ({
              sellerOrgId: r.sellerOrgId,
              materialId: r.materialId,
              deliveredVia: "in_app" as const,
            })),
          },
        },
      });
      created++;
      recipientCount += recipients.length;
      for (const r of recipients) {
        notifiedSellerOrgs.add(r.sellerOrgId);
        engagementRows.push({
          type: "quote_request",
          designerOrgId: ctx.orgId,
          sellerOrgId: r.sellerOrgId,
          specItemId: item.id,
          materialId: r.materialId,
          rfqId: rfq.id,
          creditCost: creditCostFor("quote_request"), // 0 while billing OFF (inert)
          dedupKey: computeDedupKey({
            type: "quote_request",
            designerOrgId: ctx.orgId,
            sellerOrgId: r.sellerOrgId,
            specItemId: item.id,
            nowMs: now.getTime(),
          }),
        });
      }

      await writeAudit(tx, {
        orgId: ctx.orgId,
        userId: ctx.userId,
        entityType: "rfq",
        entityId: rfq.id,
        action: "create",
        diff: { specItemId: item.id, recipients: recipients.length },
      });
    }
  });

  if (created > 0) {
    // Phase 5 (inert): record the quote_request leads. `skipDuplicates` applies
    // the anti-broadcast dedup (same seller×spec×window counted once) and keeps
    // this from ever throwing into the RFQ result. Wrapped best-effort too.
    try {
      await prisma.engagementEvent.createMany({
        data: engagementRows,
        skipDuplicates: true,
      });
    } catch {
      // The inert ledger must never break RFQ sending.
    }
    await track(EVENTS.rfqSent, {
      orgId: ctx.orgId,
      userId: ctx.userId,
      props: { created, recipients: recipientCount },
    });
    // แจ้งเตือนผู้ขายทุกเจ้าที่ได้รับ (ไม่มีข้อมูลติดต่อผู้ออกแบบ — rule #4)
    for (const orgId of notifiedSellerOrgs) {
      await notifyOrg(orgId, {
        type: "rfq_new",
        payload: { count: created },
        href: "/seller/rfq",
      });
    }
  }
  return { created, skipped, recipients: recipientCount };
}

/** specItemId → derived RFQ state, for reflecting sent/quoted in the schedule. */
export type RfqItemState = "sent" | "quoted" | "closed";

export async function getRfqStatusMap(
  projectId: string,
): Promise<Map<string, RfqItemState>> {
  const rfqs = await prisma.rFQ.findMany({
    where: { projectId, status: { in: ["open", "quoted", "closed_won"] } },
    select: { specItemId: true, status: true },
  });
  // Precedence per line: closed (deal done) > quoted > sent. Without the
  // closed entry a won line looked "never sent" and could be re-sent.
  const map = new Map<string, RfqItemState>();
  for (const r of rfqs) {
    const current = map.get(r.specItemId);
    if (r.status === "closed_won") map.set(r.specItemId, "closed");
    else if (r.status === "quoted" && current !== "closed") {
      map.set(r.specItemId, "quoted");
    } else if (!current) map.set(r.specItemId, "sent");
  }
  return map;
}

function toDesignerRecord(r: {
  id: string;
  specItemId: string;
  projectId: string;
  note: string | null;
  wantSample: boolean;
  status: string;
  slaDueAt: Date | null;
  createdById: string | null;
  project: { name: string };
  specItem: { zone: string | null; category: string | null; qty: unknown; qtyUnit: string | null };
  createdBy: { name: string | null; phone: string | null; email: string } | null;
  recipients: { materialId: string | null }[];
}): DesignerRfqRecord {
  return {
    id: r.id,
    specItemId: r.specItemId,
    projectId: r.projectId,
    projectName: r.project.name,
    zone: r.specItem.zone,
    category: r.specItem.category,
    qty: r.specItem.qty != null ? String(r.specItem.qty) : null,
    qtyUnit: r.specItem.qtyUnit,
    note: r.note,
    wantSample: r.wantSample,
    status: r.status,
    slaDueAt: r.slaDueAt ? r.slaDueAt.toISOString() : null,
    materialId: r.recipients[0]?.materialId ?? null,
    createdById: r.createdById,
    designerName: r.createdBy?.name ?? null,
    designerPhone: r.createdBy?.phone ?? null,
    designerEmail: r.createdBy?.email ?? null,
  };
}

const RFQ_INCLUDE = {
  project: { select: { name: true } },
  specItem: { select: { zone: true, category: true, qty: true, qtyUnit: true } },
  createdBy: { select: { name: true, phone: true, email: true } },
  recipients: { select: { materialId: true } },
} as const;

/** Designer's own RFQs (full detail). */
export async function listDesignerRfqs(
  orgId: string,
): Promise<DesignerRfqRecord[]> {
  const rows = await prisma.rFQ.findMany({
    where: { project: { orgId } },
    orderBy: { createdAt: "desc" },
    include: RFQ_INCLUDE,
  });
  return rows.map(toDesignerRecord);
}

/** RFQs a seller received — PRIVACY-SAFE (no designer contact, rule #4). */
export async function listSellerRfqs(sellerOrgId: string): Promise<SellerRfqView[]> {
  const rows = await prisma.rFQ.findMany({
    where: { recipients: { some: { sellerOrgId } } },
    orderBy: { slaDueAt: "asc" },
    include: {
      ...RFQ_INCLUDE,
      // ONLY this seller's recipient rows — the unfiltered include would leak
      // whichever competitor's materialId happens to sort first.
      recipients: {
        where: { sellerOrgId },
        select: { materialId: true },
      },
    },
  });
  // Route through the designer record then strip to the seller view, so the
  // privacy projection is the single choke point.
  return rows.map((r) => toSellerRfqView(toDesignerRecord(r)));
}

// ── 5D RFQ tracking: per-seller timeline (sent → opened → quoted) ──────
export interface RfqRecipientTrack {
  sellerOrgId: string;
  sellerName: string;
  sentAt: string;
  openedAt: string | null;
  respondedAt: string | null;
}

/** specItemId → recipients with their timeline stamps (owner org only). */
export async function getRfqTrackingMap(
  orgId: string,
  projectId: string,
): Promise<Map<string, RfqRecipientTrack[]>> {
  const rfqs = await prisma.rFQ.findMany({
    where: { projectId, project: { orgId }, status: { in: ["open", "quoted", "closed_won"] } },
    select: {
      specItemId: true,
      createdAt: true,
      recipients: {
        select: {
          sellerOrgId: true,
          openedAt: true,
          respondedAt: true,
          seller: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const map = new Map<string, RfqRecipientTrack[]>();
  for (const r of rfqs) {
    if (map.has(r.specItemId)) continue; // newest RFQ per line wins
    map.set(
      r.specItemId,
      r.recipients.map((rec) => ({
        sellerOrgId: rec.sellerOrgId,
        sellerName: rec.seller.name,
        sentAt: r.createdAt.toISOString(),
        openedAt: rec.openedAt ? rec.openedAt.toISOString() : null,
        respondedAt: rec.respondedAt ? rec.respondedAt.toISOString() : null,
      })),
    );
  }
  return map;
}
