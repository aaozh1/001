import { describe, expect, it } from "vitest";
import {
  ENGAGEMENT_CREDIT_COST,
  computeDedupKey,
  creditCostFor,
  debitWallet,
  engagementBillingEnabled,
  isPdpaGated,
} from "@/lib/billing/engagement";

// Phase 5 foundation (inert). สิ่งที่เทสต์ยืนยัน: ระบบ "ปิดโดย default",
// PDPA-gated, ราคาอิง type ล้วน (กติกาข้อ 2), dedup กันซ้ำ, หัก wallet ไม่ติดลบ.

describe("engagement billing is OFF by default (inert foundation)", () => {
  it("disabled unless ENGAGEMENT_BILLING_ENABLED === 'true'", () => {
    expect(engagementBillingEnabled({} as NodeJS.ProcessEnv)).toBe(false);
    expect(engagementBillingEnabled({ ENGAGEMENT_BILLING_ENABLED: "1" } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(engagementBillingEnabled({ ENGAGEMENT_BILLING_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });

  it("all placeholder prices are 0 until validated with sellers (Q6)", () => {
    expect(ENGAGEMENT_CREDIT_COST.sample_request).toBe(0);
    expect(ENGAGEMENT_CREDIT_COST.contact_request).toBe(0);
    expect(ENGAGEMENT_CREDIT_COST.quote_request).toBe(0);
  });
});

describe("PDPA gating (iron rule #5)", () => {
  it("sample/contact are PDPA-gated; quote is not", () => {
    expect(isPdpaGated("sample_request")).toBe(true);
    expect(isPdpaGated("contact_request")).toBe(true);
    expect(isPdpaGated("quote_request")).toBe(false);
  });

  it("PDPA-gated types cost 0 even with billing on, until lawyer approves", () => {
    // billing on but PDPA not approved → still free
    expect(creditCostFor("sample_request", { billingEnabled: true, pdpaApproved: false })).toBe(0);
    expect(creditCostFor("contact_request", { billingEnabled: true, pdpaApproved: false })).toBe(0);
    // quote is not PDPA-gated but price is still 0 placeholder
    expect(creditCostFor("quote_request", { billingEnabled: true })).toBe(0);
  });

  it("cost is always 0 when billing disabled (inert)", () => {
    expect(creditCostFor("quote_request", { billingEnabled: false })).toBe(0);
    expect(creditCostFor("sample_request", { billingEnabled: false, pdpaApproved: true })).toBe(0);
  });
});

describe("computeDedupKey — anti-broadcast (Q1)", () => {
  const base = {
    type: "quote_request" as const,
    designerOrgId: "d1",
    sellerOrgId: "s1",
    specItemId: "spec1",
    windowMs: 1000,
  };

  it("same seller×designer×spec×type within the window → same key", () => {
    const a = computeDedupKey({ ...base, nowMs: 0 });
    const b = computeDedupKey({ ...base, nowMs: 999 });
    expect(a).toBe(b);
  });

  it("crossing the window boundary → different key (can be re-charged)", () => {
    const a = computeDedupKey({ ...base, nowMs: 0 });
    const c = computeDedupKey({ ...base, nowMs: 1000 });
    expect(a).not.toBe(c);
  });

  it("different seller → different key (each seller counted once per window)", () => {
    const a = computeDedupKey({ ...base, nowMs: 0 });
    const other = computeDedupKey({ ...base, sellerOrgId: "s2", nowMs: 0 });
    expect(a).not.toBe(other);
  });

  it("different type → different key", () => {
    const a = computeDedupKey({ ...base, nowMs: 0 });
    const sample = computeDedupKey({ ...base, type: "sample_request", nowMs: 0 });
    expect(a).not.toBe(sample);
  });
});

describe("debitWallet — pure, never goes negative", () => {
  it("zero cost → ok, no debit", () => {
    expect(debitWallet(100, 0)).toEqual({ ok: true, balanceAfter: 100, debited: 0, reason: "zero_cost" });
  });

  it("sufficient balance → debits and lowers balance", () => {
    expect(debitWallet(100, 30)).toEqual({ ok: true, balanceAfter: 70, debited: 30 });
  });

  it("insufficient balance → rejected, balance untouched", () => {
    expect(debitWallet(20, 30)).toEqual({ ok: false, balanceAfter: 20, debited: 0, reason: "insufficient" });
  });

  it("exact balance → allowed to zero", () => {
    expect(debitWallet(30, 30)).toEqual({ ok: true, balanceAfter: 0, debited: 30 });
  });
});
