import { describe, it, expect } from "vitest";
import {
  computeSlaDueAt,
  dedupeRecipients,
  toSellerRfqView,
  DEFAULT_SLA_HOURS,
  type DesignerRfqRecord,
} from "@/lib/rfq/logic";

describe("computeSlaDueAt", () => {
  const now = new Date("2026-07-19T00:00:00.000Z");

  it("uses a future deadline as-is", () => {
    const deadline = new Date("2026-07-25T00:00:00.000Z");
    expect(computeSlaDueAt(now, deadline)).toEqual(deadline);
  });

  it("falls back to the default SLA window with no deadline", () => {
    const due = computeSlaDueAt(now, null);
    expect(due.getTime() - now.getTime()).toBe(DEFAULT_SLA_HOURS * 3600 * 1000);
  });

  it("ignores a past deadline (uses the default window)", () => {
    const past = new Date("2026-07-18T00:00:00.000Z");
    const due = computeSlaDueAt(now, past);
    expect(due.getTime()).toBeGreaterThan(now.getTime());
  });
});

describe("dedupeRecipients", () => {
  it("requests every option, deduping identical seller+material", () => {
    const out = dedupeRecipients([
      { materialId: "m1", sellerOrgId: "s1" },
      { materialId: "m2", sellerOrgId: "s1" }, // same seller, different material → kept
      { materialId: "m1", sellerOrgId: "s1" }, // exact dup → dropped
      { materialId: "m1", sellerOrgId: "s2" }, // same material, other seller → kept
    ]);
    expect(out).toEqual([
      { sellerOrgId: "s1", materialId: "m1" },
      { sellerOrgId: "s1", materialId: "m2" },
      { sellerOrgId: "s2", materialId: "m1" },
    ]);
  });
});

describe("toSellerRfqView — privacy (rule #4)", () => {
  const record: DesignerRfqRecord = {
    id: "r1",
    specItemId: "i1",
    projectId: "p1",
    projectName: "บ้านหัวหิน",
    zone: "พื้น",
    category: "กระเบื้อง",
    qty: "48",
    qtyUnit: "ตร.ม.",
    note: "ขอตัวอย่าง",
    wantSample: true,
    status: "open",
    slaDueAt: "2026-07-21T00:00:00.000Z",
    materialId: "m1",
    createdById: "u1",
    designerName: "ปวีณ์",
    designerPhone: "0812345678",
    designerEmail: "designer@matlist.dev",
  };

  it("keeps the spec context sellers need", () => {
    const v = toSellerRfqView(record);
    expect(v.projectName).toBe("บ้านหัวหิน");
    expect(v.zone).toBe("พื้น");
    expect(v.materialId).toBe("m1");
    expect(v.wantSample).toBe(true);
    expect(v.slaDueAt).toBe("2026-07-21T00:00:00.000Z");
  });

  it("NEVER leaks the designer's identity or contact", () => {
    const v = toSellerRfqView(record) as unknown as Record<string, unknown>;
    for (const forbidden of [
      "createdById",
      "designerName",
      "designerPhone",
      "designerEmail",
    ]) {
      expect(v[forbidden]).toBeUndefined();
    }
    // and no value in the view equals a contact string
    const values = JSON.stringify(v);
    expect(values).not.toContain("0812345678");
    expect(values).not.toContain("designer@matlist.dev");
    expect(values).not.toContain("ปวีณ์");
  });
});
