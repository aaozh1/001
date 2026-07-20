import { describe, expect, it } from "vitest";
import {
  DESIGNER_FUNNEL,
  EVENTS,
  SELLER_FUNNEL,
  computeFunnel,
  countEvents,
} from "@/lib/analytics/events";

describe("funnel definitions (AC 4.2: track funnel ทั้ง 2 ฝั่ง)", () => {
  it("both funnels start at signup and end at the money moment", () => {
    expect(DESIGNER_FUNNEL[0]).toBe(EVENTS.signupDesigner);
    expect(DESIGNER_FUNNEL[DESIGNER_FUNNEL.length - 1]).toBe(EVENTS.winnerSelected);
    expect(SELLER_FUNNEL[0]).toBe(EVENTS.signupSeller);
    expect(SELLER_FUNNEL[SELLER_FUNNEL.length - 1]).toBe(EVENTS.rfqWon);
  });
});

describe("computeFunnel", () => {
  const rows = [
    // org A goes all the way; org B stops after project; org C only signs up.
    { event: EVENTS.signupDesigner, orgId: "A" },
    { event: EVENTS.signupDesigner, orgId: "B" },
    { event: EVENTS.signupDesigner, orgId: "C" },
    { event: EVENTS.projectCreated, orgId: "A" },
    { event: EVENTS.projectCreated, orgId: "A" }, // repeat — still ONE org
    { event: EVENTS.projectCreated, orgId: "B" },
    { event: EVENTS.optionAdded, orgId: "A" },
    { event: EVENTS.rfqSent, orgId: "A" },
    { event: EVENTS.winnerSelected, orgId: "A" },
  ];

  it("counts distinct orgs per step with % of first and previous", () => {
    const f = computeFunnel(rows, DESIGNER_FUNNEL);
    expect(f.map((s) => s.orgs)).toEqual([3, 2, 1, 1, 1]);
    expect(f[0]).toMatchObject({ pctOfFirst: 100, pctOfPrev: null });
    expect(f[1]).toMatchObject({ pctOfFirst: 67, pctOfPrev: 67 });
    expect(f[2]).toMatchObject({ pctOfFirst: 33, pctOfPrev: 50 });
    expect(f[4]).toMatchObject({ pctOfFirst: 33, pctOfPrev: 100 });
  });

  it("ignores rows without an orgId and handles an empty log", () => {
    expect(
      computeFunnel([{ event: EVENTS.signupDesigner, orgId: null }], DESIGNER_FUNNEL)[0]
        .orgs,
    ).toBe(0);
    const empty = computeFunnel([], DESIGNER_FUNNEL);
    expect(empty[0]).toMatchObject({ orgs: 0, pctOfFirst: null, pctOfPrev: null });
    expect(empty[1].pctOfPrev).toBeNull();
  });
});

describe("countEvents", () => {
  it("totals occurrences (not distinct orgs)", () => {
    const counts = countEvents([
      { event: "a" },
      { event: "a" },
      { event: "b" },
    ]);
    expect(counts.get("a")).toBe(2);
    expect(counts.get("b")).toBe(1);
  });
});
