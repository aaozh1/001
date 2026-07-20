// Template & Material Set logic — pure + unit-tested (Studio features, 3.2).
//
// A TEMPLATE captures a project's code structure (โครงรหัส): the codes, zones,
// categories and units — NOT quantities or materials, which are project-
// specific. A MATERIAL SET is a reusable palette of material ids; applying it
// to a project adds each material as an option on every spec line whose
// category matches, respecting the 4-option cap and never touching confirmed
// lines.

import { MAX_SPEC_OPTIONS } from "@/lib/spec/options";
import { type DesignerPlan, planIncludes } from "@/lib/billing/plans";

// ── Studio gate ────────────────────────────────────────────────────────

/** Both 3.2 features sit behind the Studio tier (CLAUDE.md freemium line). */
export function canUseTemplates(plan: DesignerPlan): boolean {
  return planIncludes(plan, "templates");
}
export function canUseMaterialSets(plan: DesignerPlan): boolean {
  return planIncludes(plan, "material_sets");
}

// ── Template structure ─────────────────────────────────────────────────

export interface TemplateLine {
  code: string;
  zone: string | null;
  category: string | null;
  qtyUnit: string | null;
}

/** Extract the reusable structure from a project's spec items (in order). */
export function structureFromItems(
  items: readonly {
    code: string;
    zone: string | null;
    category: string | null;
    qtyUnit: string | null;
  }[],
): TemplateLine[] {
  return items.map((i) => ({
    code: i.code,
    zone: i.zone,
    category: i.category,
    qtyUnit: i.qtyUnit,
  }));
}

/** Parse a stored structure JSON back into lines; tolerant of bad data. */
export function parseStructure(value: unknown): TemplateLine[] {
  if (!Array.isArray(value)) return [];
  const lines: TemplateLine[] = [];
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.code !== "string" || !r.code.trim()) continue;
    lines.push({
      code: r.code,
      zone: typeof r.zone === "string" ? r.zone : null,
      category: typeof r.category === "string" ? r.category : null,
      qtyUnit: typeof r.qtyUnit === "string" ? r.qtyUnit : null,
    });
  }
  return lines;
}

// ── Material-set apply planner ─────────────────────────────────────────

export interface ApplyTargetItem {
  id: string;
  category: string | null;
  confirmedMaterialId: string | null;
  optionMaterialIds: readonly string[];
}

export interface SetMaterial {
  id: string;
  category: string;
}

export interface ApplyPlan {
  additions: { itemId: string; materialId: string }[];
  skippedFull: number;
  skippedConfirmed: number;
}

/**
 * Decide which (item, material) option rows applying a set would create.
 * Rules: category must match · confirmed lines are left alone · duplicates are
 * skipped silently · the 4-option cap is never exceeded (set materials fill the
 * remaining slots in set order).
 */
export function planSetApplication(
  items: readonly ApplyTargetItem[],
  setMaterials: readonly SetMaterial[],
  maxOptions: number = MAX_SPEC_OPTIONS,
): ApplyPlan {
  const additions: ApplyPlan["additions"] = [];
  let skippedFull = 0;
  let skippedConfirmed = 0;

  for (const item of items) {
    if (!item.category) continue;
    const candidates = setMaterials.filter(
      (m) => m.category === item.category && !item.optionMaterialIds.includes(m.id),
    );
    if (candidates.length === 0) continue;

    if (item.confirmedMaterialId) {
      skippedConfirmed += 1;
      continue;
    }

    let slots = Math.max(0, maxOptions - item.optionMaterialIds.length);
    if (slots === 0) {
      skippedFull += 1;
      continue;
    }
    for (const m of candidates) {
      if (slots === 0) {
        skippedFull += 1;
        break;
      }
      additions.push({ itemId: item.id, materialId: m.id });
      slots -= 1;
    }
  }
  return { additions, skippedFull, skippedConfirmed };
}
