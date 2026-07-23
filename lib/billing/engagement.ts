// Phase 5 — Billable Engagement Events (FOUNDATION, inert by default)
//
// ข้อเสนอ: docs/proposals/MONETIZATION_REWORK.md
//
// โมดูลนี้เป็น "ตรรกะบริสุทธิ์" (ไม่มี prisma/side-effect) เพื่อวางรากฐาน
// พร้อมเทสต์ แต่ **ปิดสวิตช์ทั้งหมด** จนกว่าจะปลดล็อกด่าน 🛑:
//   • ราคายังไม่ validate → creditCost = 0 (placeholder) และระบบ billing ปิด
//     ด้วย ENV flag (default OFF) — กติกาเหล็กข้อ 2 (ราคาเท่ากันทุกเจ้าใน type)
//   • sample_request / contact_request เก็บ/ส่งข้อมูลส่วนบุคคล →
//     PDPA-gated จนทนายอนุมัติ (Phase 4.1) — กติกาเหล็กข้อ 5
//
// ยังไม่ผูกกับ flow RFQ→Quote จริง โมดูลนี้จึง "ไม่มีผลกับผู้ใช้" จนกว่าจะ
// เปิด flag + เดินสายในเฟสถัดไป (หลังได้ decision จากคน)

export type EngagementType =
  | "sample_request"
  | "contact_request"
  | "quote_request";

/** ค่าคงที่ ENV: ต้องตั้ง "true" ชัดเจนถึงจะเปิดระบบเก็บเงิน engagement.
 *  ไม่ตั้ง / ค่าอื่น = ปิด (default OFF) — foundation จึง inert. */
export function engagementBillingEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.ENGAGEMENT_BILLING_ENABLED === "true";
}

/** ประเภทที่เก็บ/เปิดเผยข้อมูลส่วนบุคคล → ต้องผ่าน PDPA (ทนาย) ก่อนเปิด. */
export function isPdpaGated(type: EngagementType): boolean {
  return type === "sample_request" || type === "contact_request";
}

/**
 * ราคาเครดิตต่อ type — **placeholder ทั้งหมด = 0 (ยังไม่ validate)**.
 * ตัวเลขจริงต้องมาจากการคุยผู้ขาย 5–10 ราย (Q6) แล้วค่อยแก้ที่นี่จุดเดียว
 * ห้าม hardcode ราคากระจายในโค้ด และต้อง "เท่ากันทุกผู้ขายใน type เดียวกัน"
 * (กติกาเหล็กข้อ 2 — ราคาอิง type ล้วน ไม่อิงตัวผู้ขาย)
 */
export const ENGAGEMENT_CREDIT_COST: Record<EngagementType, number> = {
  sample_request: 0, // UNVALIDATED — บรีฟตั้งสมมติฐาน ~฿60–150
  contact_request: 0, // UNVALIDATED — ~฿40–120
  quote_request: 0, // UNVALIDATED — ~฿30–90
};

/**
 * คิดค่าเครดิตของ event หนึ่ง — คืน 0 เสมอถ้าระบบยังปิด (inert),
 * หรือถ้าเป็น type ที่ยัง PDPA-gated. ราคาอิง *type* ล้วน (กติกาข้อ 2).
 */
export function creditCostFor(
  type: EngagementType,
  opts: { billingEnabled?: boolean; pdpaApproved?: boolean } = {},
): number {
  const billingEnabled = opts.billingEnabled ?? engagementBillingEnabled();
  if (!billingEnabled) return 0;
  // sample/contact ยังคิดเงินไม่ได้จน PDPA ผ่าน (แม้เปิด billing แล้วก็ตาม)
  if (isPdpaGated(type) && !opts.pdpaApproved) return 0;
  return ENGAGEMENT_CREDIT_COST[type];
}

/**
 * กุญแจกันซ้ำ (anti-broadcast) — เจ้าเดิม × ดีไซเนอร์เดิม × spec เดิม × type
 * ภายใน "หน้าต่างเวลา" เดียวกัน จะได้ key เดียวกัน → DB unique กันเก็บซ้ำ
 * windowMs default 24 ชม. (ค่าจริง = business decision Q1 🛑)
 *
 * `nowMs` รับเข้ามาเพื่อให้ pure/ทดสอบได้ (ไม่เรียก Date.now ในตัวฟังก์ชัน).
 */
export function computeDedupKey(input: {
  type: EngagementType;
  designerOrgId: string;
  sellerOrgId: string;
  specItemId?: string | null;
  nowMs: number;
  windowMs?: number;
}): string {
  const windowMs = input.windowMs ?? 24 * 60 * 60 * 1000;
  const bucket = Math.floor(input.nowMs / windowMs);
  return [
    input.type,
    input.designerOrgId,
    input.sellerOrgId,
    input.specItemId ?? "-",
    `w${bucket}`,
  ].join(":");
}

export interface WalletDebitResult {
  ok: boolean;
  /** ยอดคงเหลือหลังทำรายการ (ไม่เปลี่ยนถ้า ok=false). */
  balanceAfter: number;
  /** จำนวนที่หัก (0 ถ้าไม่หัก). */
  debited: number;
  reason?: "insufficient" | "zero_cost";
}

/**
 * หักเครดิตจาก wallet แบบ pure — ไม่แตะ DB, แค่คำนวณผลลัพธ์.
 * - cost = 0 → ไม่หัก (zero_cost) แต่ถือว่า ok (event ฟรี/ปิด billing)
 * - ยอดไม่พอ → ปฏิเสธ ไม่ติดลบ
 */
export function debitWallet(balance: number, cost: number): WalletDebitResult {
  if (cost <= 0) {
    return { ok: true, balanceAfter: balance, debited: 0, reason: "zero_cost" };
  }
  if (balance < cost) {
    return { ok: false, balanceAfter: balance, debited: 0, reason: "insufficient" };
  }
  return { ok: true, balanceAfter: balance - cost, debited: cost };
}
