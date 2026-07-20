// Billing plans — pure + unit-tested. The designer side is freemium: the whole
// backbone (projects, spec schedule, RFQ, chat, Spec Book) is FREE — that is the
// product's promise ("มีค่าตั้งแต่ยังไม่มีผู้ขายสักราย"). Paid tiers unlock
// power features only: VE Finder + Revit (Pro), Templates + Material Sets +
// team seats (Studio). Prices from DECISIONS.md (390–690 THB / seat / month).
//
// NOTE: real charging is Phase 3.5 (Omise/2C2P). This module never talks to a
// payment vendor — it only defines what each plan is and what it unlocks.

export type DesignerPlan = "free" | "pro" | "studio";

// Capabilities a plan can unlock. Feature code added later (VE Finder, Revit,
// Templates…) calls planIncludes() to gate itself — the gate lives here so the
// boundary is defined once and tested.
export type PlanGate =
  | "ve_finder"
  | "revit_export"
  | "templates"
  | "material_sets"
  | "team_seats";

export interface PlanDef {
  id: DesignerPlan;
  /** THB per seat per month. Free is 0. */
  priceThb: number;
  /** Capabilities unlocked at this tier (a superset of the tier below). */
  gates: readonly PlanGate[];
  /** i18n keys (billing.feat.*) describing what the tier includes, for the UI. */
  featureKeys: readonly string[];
}

export const DESIGNER_PLANS: Record<DesignerPlan, PlanDef> = {
  free: {
    id: "free",
    priceThb: 0,
    gates: [],
    featureKeys: ["unlimitedProjects", "specSchedule", "rfqChat", "specBook"],
  },
  pro: {
    id: "pro",
    priceThb: 390,
    gates: ["ve_finder", "revit_export"],
    featureKeys: ["everythingFree", "veFinder", "revitExport"],
  },
  studio: {
    id: "studio",
    priceThb: 690,
    gates: ["ve_finder", "revit_export", "templates", "material_sets", "team_seats"],
    featureKeys: ["everythingPro", "templates", "materialSets", "teamSeats"],
  },
};

/** Plans in display / upgrade order (cheapest first). */
export const DESIGNER_PLAN_ORDER: readonly DesignerPlan[] = ["free", "pro", "studio"];

const RANK: Record<DesignerPlan, number> = { free: 0, pro: 1, studio: 2 };

/** Does this plan unlock the given capability? */
export function planIncludes(plan: DesignerPlan, gate: PlanGate): boolean {
  return DESIGNER_PLANS[plan].gates.includes(gate);
}

/** The cheapest plan that unlocks a capability, or null if none does. */
export function requiredPlanFor(gate: PlanGate): DesignerPlan | null {
  for (const id of DESIGNER_PLAN_ORDER) {
    if (planIncludes(id, gate)) return id;
  }
  return null;
}

/** True when `target` is a strictly higher tier than `current` (an upgrade). */
export function isUpgrade(current: DesignerPlan, target: DesignerPlan): boolean {
  return RANK[target] > RANK[current];
}

/** Narrow an arbitrary string (e.g. from the DB enum) to a DesignerPlan. */
export function isDesignerPlan(value: string): value is DesignerPlan {
  return value === "free" || value === "pro" || value === "studio";
}
