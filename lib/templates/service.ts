import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { EVENTS } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import type { DesignerContext } from "@/lib/projects/service";
import { getSubscription } from "@/lib/billing/service";
import {
  type TemplateLine,
  canUseMaterialSets,
  canUseTemplates,
  parseStructure,
  planSetApplication,
  structureFromItems,
} from "./logic";

// Templates & Material Sets (Studio gate, ROADMAP 3.2). The gate is enforced
// HERE, not only in the UI — a non-Studio org gets `gated` back no matter how
// the request arrives.

export type Gated = { ok: false; error: "gated" };

async function studioGate(
  orgId: string,
  feature: "templates" | "material_sets",
): Promise<boolean> {
  const sub = await getSubscription(orgId);
  return feature === "templates"
    ? canUseTemplates(sub.plan)
    : canUseMaterialSets(sub.plan);
}

// ── Templates ──────────────────────────────────────────────────────────

export interface TemplateSummary {
  id: string;
  name: string;
  buildingType: string | null;
  lineCount: number;
  isSystem: boolean;
}

/** Org templates + system templates (orgId null). List is visible on any plan
 *  (so the value is discoverable); creating/using is Studio-gated. */
export async function listTemplates(orgId: string): Promise<TemplateSummary[]> {
  const rows = await prisma.template.findMany({
    where: { OR: [{ orgId }, { orgId: null }] },
    orderBy: [{ orgId: "desc" }, { name: "asc" }],
    select: { id: true, orgId: true, name: true, buildingType: true, structure: true },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    buildingType: r.buildingType,
    lineCount: parseStructure(r.structure).length,
    isSystem: r.orgId === null,
  }));
}

export type SaveTemplateResult =
  | { ok: true; templateId: string }
  | { ok: false; error: "gated" | "not_found" | "empty" };

/** Snapshot a project's code structure as a reusable template. */
export async function saveTemplateFromProject(
  ctx: DesignerContext,
  projectId: string,
  name: string,
): Promise<SaveTemplateResult> {
  if (!(await studioGate(ctx.orgId, "templates"))) return { ok: false, error: "gated" };

  const project = await prisma.project.findFirst({
    where: { id: projectId, orgId: ctx.orgId },
    select: {
      buildingType: true,
      specItems: {
        orderBy: { sortOrder: "asc" },
        select: { code: true, zone: true, category: true, qtyUnit: true },
      },
    },
  });
  if (!project) return { ok: false, error: "not_found" };
  const structure = structureFromItems(project.specItems);
  if (structure.length === 0) return { ok: false, error: "empty" };

  const created = await prisma.template.create({
    data: {
      orgId: ctx.orgId,
      name,
      buildingType: project.buildingType,
      structure: structure as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
  await track(EVENTS.templateSaved, { orgId: ctx.orgId, userId: ctx.userId });
  return { ok: true, templateId: created.id };
}

export type CreateFromTemplateResult =
  | { ok: true; projectId: string; itemCount: number }
  | { ok: false; error: "gated" | "not_found" | "empty" };

/** Start a new project from a template's structure. */
export async function createProjectFromTemplate(
  ctx: DesignerContext,
  templateId: string,
  name: string,
): Promise<CreateFromTemplateResult> {
  if (!(await studioGate(ctx.orgId, "templates"))) return { ok: false, error: "gated" };

  const template = await prisma.template.findFirst({
    where: { id: templateId, OR: [{ orgId: ctx.orgId }, { orgId: null }] },
    select: { buildingType: true, structure: true },
  });
  if (!template) return { ok: false, error: "not_found" };
  const lines: TemplateLine[] = parseStructure(template.structure);
  if (lines.length === 0) return { ok: false, error: "empty" };

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        orgId: ctx.orgId,
        name,
        buildingType: template.buildingType,
        createdById: ctx.userId,
        specItems: {
          create: lines.map((l, i) => ({
            code: l.code,
            zone: l.zone,
            category: l.category,
            qtyUnit: l.qtyUnit,
            sortOrder: i,
          })),
        },
      },
      select: { id: true, name: true },
    });
    await writeAudit(tx, {
      orgId: ctx.orgId,
      userId: ctx.userId,
      entityType: "project",
      entityId: created.id,
      action: "create_from_template",
      diff: { templateId, itemCount: lines.length },
    });
    return created;
  });
  await track(EVENTS.templateUsed, { orgId: ctx.orgId, userId: ctx.userId });
  await track(EVENTS.projectCreated, {
    orgId: ctx.orgId,
    userId: ctx.userId,
    props: { via: "template" },
  });
  return { ok: true, projectId: project.id, itemCount: lines.length };
}

export async function deleteTemplate(
  ctx: DesignerContext,
  templateId: string,
): Promise<boolean> {
  // Own templates only — system templates are read-only.
  const { count } = await prisma.template.deleteMany({
    where: { id: templateId, orgId: ctx.orgId },
  });
  return count > 0;
}

// ── Material sets ──────────────────────────────────────────────────────

export interface MaterialSetSummary {
  id: string;
  name: string;
  materials: { id: string; name: string; category: string }[];
}

export async function listMaterialSets(orgId: string): Promise<MaterialSetSummary[]> {
  const sets = await prisma.materialSet.findMany({
    where: { orgId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, materialIds: true },
  });
  const allIds = [...new Set(sets.flatMap((s) => s.materialIds))];
  const materials = await prisma.material.findMany({
    where: { id: { in: allIds } },
    select: { id: true, nameTh: true, category: true },
  });
  const byId = new Map(materials.map((m) => [m.id, m]));
  return sets.map((s) => ({
    id: s.id,
    name: s.name,
    materials: s.materialIds
      .map((id) => byId.get(id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m))
      .map((m) => ({ id: m.id, name: m.nameTh, category: m.category })),
  }));
}

export type SaveSetResult =
  | { ok: true; setId: string; materialCount: number }
  | { ok: false; error: "gated" | "not_found" | "empty" };

/** Save a project's current option palette (all option materials) as a set. */
export async function saveSetFromProject(
  ctx: DesignerContext,
  projectId: string,
  name: string,
): Promise<SaveSetResult> {
  if (!(await studioGate(ctx.orgId, "material_sets"))) return { ok: false, error: "gated" };

  const project = await prisma.project.findFirst({
    where: { id: projectId, orgId: ctx.orgId },
    select: { specItems: { select: { options: { select: { materialId: true } } } } },
  });
  if (!project) return { ok: false, error: "not_found" };
  const materialIds = [
    ...new Set(project.specItems.flatMap((i) => i.options.map((o) => o.materialId))),
  ];
  if (materialIds.length === 0) return { ok: false, error: "empty" };

  const created = await prisma.materialSet.create({
    data: { orgId: ctx.orgId, name, materialIds },
    select: { id: true },
  });
  return { ok: true, setId: created.id, materialCount: materialIds.length };
}

export type ApplySetResult =
  | { ok: true; added: number; skippedFull: number; skippedConfirmed: number }
  | { ok: false; error: "gated" | "not_found" };

/** Apply a set to a project: fill matching lines' remaining option slots. */
export async function applySetToProject(
  ctx: DesignerContext,
  setId: string,
  projectId: string,
): Promise<ApplySetResult> {
  if (!(await studioGate(ctx.orgId, "material_sets"))) return { ok: false, error: "gated" };

  const [set, project] = await Promise.all([
    prisma.materialSet.findFirst({
      where: { id: setId, orgId: ctx.orgId },
      select: { materialIds: true },
    }),
    prisma.project.findFirst({
      where: { id: projectId, orgId: ctx.orgId },
      select: {
        specItems: {
          select: {
            id: true,
            category: true,
            confirmedMaterialId: true,
            options: { select: { materialId: true } },
          },
        },
      },
    }),
  ]);
  if (!set || !project) return { ok: false, error: "not_found" };

  const setMaterials = await prisma.material.findMany({
    where: { id: { in: set.materialIds }, status: "published" },
    select: { id: true, category: true },
  });
  // Keep the set's stored order — the planner fills slots in set order.
  const ordered = set.materialIds
    .map((id) => setMaterials.find((m) => m.id === id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  const plan = planSetApplication(
    project.specItems.map((i) => ({
      id: i.id,
      category: i.category,
      confirmedMaterialId: i.confirmedMaterialId,
      optionMaterialIds: i.options.map((o) => o.materialId),
    })),
    ordered,
  );

  if (plan.additions.length > 0) {
    await prisma.$transaction(async (tx) => {
      await tx.specOption.createMany({
        data: plan.additions.map((a) => ({
          specItemId: a.itemId,
          materialId: a.materialId,
        })),
        skipDuplicates: true,
      });
      await writeAudit(tx, {
        orgId: ctx.orgId,
        userId: ctx.userId,
        entityType: "project",
        entityId: projectId,
        action: "apply_material_set",
        diff: { setId, added: plan.additions.length },
      });
    });
  }
  if (plan.additions.length > 0) {
    await track(EVENTS.setApplied, {
      orgId: ctx.orgId,
      userId: ctx.userId,
      props: { added: plan.additions.length },
    });
  }
  return {
    ok: true,
    added: plan.additions.length,
    skippedFull: plan.skippedFull,
    skippedConfirmed: plan.skippedConfirmed,
  };
}

export async function deleteMaterialSet(
  ctx: DesignerContext,
  setId: string,
): Promise<boolean> {
  const { count } = await prisma.materialSet.deleteMany({
    where: { id: setId, orgId: ctx.orgId },
  });
  return count > 0;
}
