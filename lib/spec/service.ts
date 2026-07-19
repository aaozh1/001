import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import type { DesignerContext } from "@/lib/projects/service";
import { assignSortOrder, isSamePermutation } from "./reorder";
import type { CreateSpecItemInput, UpdateSpecItemInput } from "./schemas";

const AUDIT_ENTITY = "spec_item";

function toDecimal(n: number | null | undefined): Prisma.Decimal | null | undefined {
  if (n === undefined) return undefined;
  return n === null ? null : new Prisma.Decimal(n);
}

async function projectOwned(orgId: string, projectId: string): Promise<boolean> {
  const p = await prisma.project.findFirst({
    where: { id: projectId, orgId },
    select: { id: true },
  });
  return !!p;
}

/** Load an item only if it belongs to a project in the org. */
async function loadOwnedItem(orgId: string, itemId: string) {
  return prisma.specItem.findFirst({
    where: { id: itemId, project: { orgId } },
    select: { id: true, projectId: true },
  });
}

export function listItems(projectId: string) {
  return prisma.specItem.findMany({
    where: { projectId },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { options: true } } },
  });
}

export async function createItem(
  ctx: DesignerContext,
  projectId: string,
  input: CreateSpecItemInput,
) {
  if (!(await projectOwned(ctx.orgId, projectId))) return null;

  const last = await prisma.specItem.aggregate({
    where: { projectId },
    _max: { sortOrder: true },
  });
  const sortOrder = (last._max.sortOrder ?? -1) + 1;

  return prisma.$transaction(async (tx) => {
    const item = await tx.specItem.create({
      data: {
        projectId,
        code: input.code,
        zone: input.zone ?? null,
        category: input.category ?? null,
        qty: toDecimal(input.qty) ?? null,
        qtyUnit: input.qtyUnit ?? null,
        sortOrder,
      },
    });
    await writeAudit(tx, {
      orgId: ctx.orgId,
      userId: ctx.userId,
      entityType: AUDIT_ENTITY,
      entityId: item.id,
      action: "create",
      diff: { projectId, code: item.code },
    });
    return item;
  });
}

export async function updateItem(
  ctx: DesignerContext,
  itemId: string,
  input: UpdateSpecItemInput,
) {
  const owned = await loadOwnedItem(ctx.orgId, itemId);
  if (!owned) return null;

  const data: Prisma.SpecItemUpdateInput = {};
  if (input.code !== undefined) data.code = input.code;
  if (input.zone !== undefined) data.zone = input.zone;
  if (input.category !== undefined) data.category = input.category;
  if (input.qty !== undefined) data.qty = toDecimal(input.qty);
  if (input.qtyUnit !== undefined) data.qtyUnit = input.qtyUnit;

  return prisma.$transaction(async (tx) => {
    const item = await tx.specItem.update({ where: { id: itemId }, data });
    await writeAudit(tx, {
      orgId: ctx.orgId,
      userId: ctx.userId,
      entityType: AUDIT_ENTITY,
      entityId: itemId,
      action: "update",
      diff: input as Prisma.InputJsonValue,
    });
    return item;
  });
}

export async function deleteItem(
  ctx: DesignerContext,
  itemId: string,
): Promise<boolean> {
  const owned = await loadOwnedItem(ctx.orgId, itemId);
  if (!owned) return false;

  await prisma.$transaction(async (tx) => {
    await tx.specItem.delete({ where: { id: itemId } });
    await writeAudit(tx, {
      orgId: ctx.orgId,
      userId: ctx.userId,
      entityType: AUDIT_ENTITY,
      entityId: itemId,
      action: "delete",
      diff: { projectId: owned.projectId },
    });
  });
  return true;
}

export type ReorderResult = "ok" | "not_found" | "invalid";

export async function reorderItems(
  ctx: DesignerContext,
  projectId: string,
  orderedIds: string[],
): Promise<ReorderResult> {
  if (!(await projectOwned(ctx.orgId, projectId))) return "not_found";

  const current = await prisma.specItem.findMany({
    where: { projectId },
    select: { id: true },
    orderBy: { sortOrder: "asc" },
  });
  const currentIds = current.map((i) => i.id);
  if (!isSamePermutation(currentIds, orderedIds)) return "invalid";

  await prisma.$transaction([
    ...assignSortOrder(orderedIds).map(({ id, sortOrder }) =>
      prisma.specItem.update({ where: { id }, data: { sortOrder } }),
    ),
    writeAudit(prisma, {
      orgId: ctx.orgId,
      userId: ctx.userId,
      entityType: AUDIT_ENTITY,
      entityId: projectId,
      action: "reorder",
      diff: { orderedIds },
    }),
  ]);
  return "ok";
}
