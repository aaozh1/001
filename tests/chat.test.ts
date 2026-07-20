import { describe, expect, it } from "vitest";
import {
  type DesignerThreadRecord,
  type RawMessage,
  MAX_MESSAGE_LEN,
  normalizeBody,
  senderSideFor,
  toMessageViews,
  toSellerThreadContext,
} from "@/lib/chat/logic";

const THREAD = { designerOrgId: "d1", sellerOrgId: "s1" };

describe("senderSideFor", () => {
  it("marks the thread's seller org as the seller side", () => {
    expect(senderSideFor("s1", THREAD)).toBe("seller");
  });
  it("treats anyone else (the designer org) as the designer side", () => {
    expect(senderSideFor("d1", THREAD)).toBe("designer");
    expect(senderSideFor("someone-else", THREAD)).toBe("designer");
  });
});

describe("toMessageViews", () => {
  const base: RawMessage[] = [
    { id: "m1", body: "hi", createdAt: new Date("2026-07-19T10:00:00Z"), senderSide: "designer" },
    { id: "m2", body: "hello", createdAt: new Date("2026-07-19T10:01:00Z"), senderSide: "seller" },
  ];

  it("marks the viewer's own messages as mine", () => {
    const asDesigner = toMessageViews(base, "designer");
    expect(asDesigner.map((m) => m.mine)).toEqual([true, false]);
    const asSeller = toMessageViews(base, "seller");
    expect(asSeller.map((m) => m.mine)).toEqual([false, true]);
  });

  it("carries only body/time/side — never an identity field", () => {
    const view = toMessageViews(base, "seller")[0];
    expect(Object.keys(view).sort()).toEqual(
      ["body", "createdAt", "id", "mine", "senderSide"].sort(),
    );
  });

  it("serialises createdAt to ISO", () => {
    expect(toMessageViews(base, "seller")[0].createdAt).toBe("2026-07-19T10:00:00.000Z");
  });
});

describe("normalizeBody", () => {
  it("trims and rejects empty/whitespace", () => {
    expect(normalizeBody("  hi  ")).toBe("hi");
    expect(normalizeBody("   ")).toBeNull();
    expect(normalizeBody("")).toBeNull();
  });
  it("clamps to the max length", () => {
    const long = "x".repeat(MAX_MESSAGE_LEN + 500);
    expect(normalizeBody(long)?.length).toBe(MAX_MESSAGE_LEN);
  });
});

describe("toSellerThreadContext (iron rule #4)", () => {
  const record: DesignerThreadRecord = {
    threadId: "t1",
    projectId: "p1",
    projectName: "Hua Hin house",
    buildingType: "house",
    specItemCount: 8,
    lastMessageAt: "2026-07-19T10:00:00.000Z",
    designerOrgId: "d1",
    designerName: "Ashram Studio",
    designerPhone: "0812345678",
    designerEmail: "designer@example.com",
  };

  it("keeps the spec context", () => {
    const ctx = toSellerThreadContext(record);
    expect(ctx.projectName).toBe("Hua Hin house");
    expect(ctx.buildingType).toBe("house");
    expect(ctx.specItemCount).toBe(8);
  });

  it("drops every designer-identity field", () => {
    const ctx = toSellerThreadContext(record);
    const serialized = JSON.stringify(ctx);
    for (const leak of ["Ashram Studio", "0812345678", "designer@example.com", "d1"]) {
      expect(serialized).not.toContain(leak);
    }
    expect(ctx).not.toHaveProperty("designerName");
    expect(ctx).not.toHaveProperty("designerPhone");
    expect(ctx).not.toHaveProperty("designerEmail");
    expect(ctx).not.toHaveProperty("designerOrgId");
  });
});
