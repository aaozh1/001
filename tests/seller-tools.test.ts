import { describe, expect, it } from "vitest";
import {
  type CompletenessInput,
  computeCompleteness,
} from "@/lib/materials/completeness";
import { countByTab, matchesTab, slaRemaining, tabOf } from "@/lib/quote/inbox-tabs";
import { canManageMaterials, canQuote } from "@/lib/permissions";

const EMPTY: CompletenessInput = {
  nameTh: null,
  nameEn: null,
  model: null,
  sku: null,
  category: null,
  color: null,
  size: null,
  price: null,
  unit: null,
  spec: null,
  cert: null,
  leadTime: null,
  moq: null,
  warranty: null,
  noteTh: null,
  swatchHex: null,
  images: [],
  specsheetUrl: null,
};

describe("computeCompleteness (AC 3.3)", () => {
  it("is 0 for an empty product and 100 for a full one", () => {
    expect(computeCompleteness(EMPTY).score).toBe(0);
    const full: CompletenessInput = {
      nameTh: "กระเบื้อง",
      nameEn: "Tile",
      model: "X1",
      sku: "SKU1",
      category: "tile",
      color: "เทา",
      size: "60×60",
      price: 450,
      unit: "ตร.ม.",
      spec: { water_abs: 0.5 },
      cert: "มอก.",
      leadTime: "7 วัน",
      moq: "10",
      warranty: "5 ปี",
      noteTh: "โน้ต",
      swatchHex: "#aabbcc",
      images: ["a.jpg"],
      specsheetUrl: "https://x/y.pdf",
    };
    expect(computeCompleteness(full).score).toBe(100);
  });

  it("core commercial facts weigh more than cosmetics", () => {
    const withPrice = computeCompleteness({ ...EMPTY, price: 100 }).score;
    const withColor = computeCompleteness({ ...EMPTY, color: "แดง" }).score;
    expect(withPrice).toBeGreaterThan(withColor);
  });

  it("lists missing fields heaviest-first for the form hints", () => {
    const r = computeCompleteness({ ...EMPTY, nameTh: "x", category: "tile" });
    expect(r.missing[0]).toBe("price");
    expect(r.missing).not.toContain("nameTh");
  });

  it("blank strings and empty objects don't count as present", () => {
    const r = computeCompleteness({ ...EMPTY, unit: "  ", spec: {} });
    expect(r.score).toBe(0);
  });
});

describe("inbox tabs", () => {
  const base = { status: "open", responded: false, quoteStatus: null };

  it("classifies each lifecycle stage", () => {
    expect(tabOf({ ...base })).toBe("awaiting");
    expect(tabOf({ ...base, status: "quoted", responded: true, quoteStatus: "submitted" })).toBe("answered");
    expect(tabOf({ ...base, quoteStatus: "selected", responded: true })).toBe("won");
    expect(tabOf({ ...base, quoteStatus: "rejected", responded: true })).toBe("lost");
  });

  it("an unanswered closed/expired RFQ is not 'awaiting' (nothing to do)", () => {
    expect(tabOf({ ...base, status: "closed_won" })).toBe("other");
    expect(tabOf({ ...base, status: "expired" })).toBe("other");
    expect(matchesTab({ ...base, status: "expired" }, "awaiting")).toBe(false);
  });

  it("counts include every tab and 'all'", () => {
    const rows = [
      { ...base },
      { ...base, status: "quoted", responded: true, quoteStatus: "submitted" },
      { ...base, responded: true, quoteStatus: "selected" },
    ];
    const c = countByTab(rows);
    expect(c).toEqual({ all: 3, awaiting: 1, answered: 1, won: 1, lost: 0 });
  });
});

describe("slaRemaining (AC 3.3: countdown จริง)", () => {
  const now = Date.parse("2026-07-20T12:00:00Z");

  it("counts down hours + minutes before the deadline", () => {
    expect(slaRemaining("2026-07-21T13:30:00Z", now)).toEqual({
      state: "due",
      hours: 25,
      minutes: 30,
    });
  });
  it("flips to overdue after the deadline", () => {
    expect(slaRemaining("2026-07-20T09:00:00Z", now)).toEqual({
      state: "overdue",
      hours: 3,
    });
  });
  it("handles missing/garbage deadlines", () => {
    expect(slaRemaining(null, now)).toEqual({ state: "none" });
    expect(slaRemaining("not-a-date", now)).toEqual({ state: "none" });
  });
});

describe("seller catalog roles", () => {
  it("owner/manager/content manage products; sales does not", () => {
    expect(canManageMaterials("owner")).toBe(true);
    expect(canManageMaterials("manager")).toBe(true);
    expect(canManageMaterials("content")).toBe(true);
    expect(canManageMaterials("sales")).toBe(false);
  });
  it("sales still quotes; content does not", () => {
    expect(canQuote("sales")).toBe(true);
    expect(canQuote("content")).toBe(false);
  });
});
