// RFQ business logic — pure + unit-tested. The RFQ engine is the revenue core,
// so its rules (privacy, SLA, "request every option") are isolated and tested.

export const DEFAULT_SLA_HOURS = 48;

/**
 * When the seller's clock runs out. Uses the designer's deadline if given,
 * otherwise a default SLA window from creation (prototype: "ตอบใน 48 ชม.").
 * Pure: `now` is passed in.
 */
export function computeSlaDueAt(
  now: Date,
  deadline: Date | null,
  slaHours: number = DEFAULT_SLA_HOURS,
): Date {
  if (deadline && deadline.getTime() > now.getTime()) return deadline;
  return new Date(now.getTime() + slaHours * 3600 * 1000);
}

export interface OptionSeller {
  materialId: string;
  sellerOrgId: string;
}
export interface RecipientSpec {
  sellerOrgId: string;
  materialId: string;
}

/**
 * Build the recipient list for an RFQ: one per option (its material's seller),
 * deduped by (seller, material). "ส่งขอทุกตัวเลือก" — every option is requested,
 * so a seller with two options in the same item gets two recipient rows.
 */
export function dedupeRecipients(options: readonly OptionSeller[]): RecipientSpec[] {
  const seen = new Set<string>();
  const out: RecipientSpec[] = [];
  for (const o of options) {
    const key = `${o.sellerOrgId}::${o.materialId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ sellerOrgId: o.sellerOrgId, materialId: o.materialId });
  }
  return out;
}

// ── Privacy (iron rule #4) ─────────────────────────────────────────────
// Sellers see the spec context but NEVER the designer's identity/contact until
// the designer engages a quote. toSellerRfqView is the ONLY shape sent to
// sellers; a test asserts no contact field can leak through it.

export interface DesignerRfqRecord {
  id: string;
  specItemId: string;
  projectId: string;
  projectName: string;
  zone: string | null;
  category: string | null;
  qty: string | null;
  qtyUnit: string | null;
  note: string | null;
  wantSample: boolean;
  status: string;
  slaDueAt: string | null;
  materialId: string | null;
  // designer-only fields below — must never reach a seller view
  createdById: string | null;
  designerName: string | null;
  designerPhone: string | null;
  designerEmail: string | null;
}

export interface SellerRfqView {
  id: string;
  projectName: string;
  zone: string | null;
  category: string | null;
  qty: string | null;
  qtyUnit: string | null;
  note: string | null;
  wantSample: boolean;
  status: string;
  slaDueAt: string | null;
  materialId: string | null;
}

/** Project a record into the seller-safe view — drops every contact field. */
export function toSellerRfqView(r: DesignerRfqRecord): SellerRfqView {
  return {
    id: r.id,
    projectName: r.projectName,
    zone: r.zone,
    category: r.category,
    qty: r.qty,
    qtyUnit: r.qtyUnit,
    note: r.note,
    wantSample: r.wantSample,
    status: r.status,
    slaDueAt: r.slaDueAt,
    materialId: r.materialId,
  };
}
