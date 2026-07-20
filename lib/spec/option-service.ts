import "server-only";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { EVENTS } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import type { DesignerContext } from "@/lib/projects/service";
import { canAddOption, isConfirmable } from "./options";

const AUDIT_ENTITY = "spec_item";

/** Load a spec item (scoped to org) with its options + confirmed material. */
async function loadItem(orgId: string, itemId: string) {
  return prisma.specItem.findFirst({
    where: { id: itemId, project: { orgId } },
    select: {
      id: true,
      confirmedMaterialId: true,
      options: { select: { id: true, materialId: true } },
    },
  });
}

export type AddOptionResult =
  | { ok: true }
  | { ok: false; error: "not_found" | "limit" | "duplicate" | "material_not_found" };

export async function addOption(
  ctx: DesignerContext,
  itemId: string,
  materialId: string,
): Promise<AddOptionResult> {
  const item = await loadItem(ctx.orgId, itemId);
  if (!item) return { ok: false, error: "not_found" };
  if (!canAddOption(item.options.length)) return { ok: false, error: "limit" };
  if (item.options.some((o) => o.materialId === materialId)) {
    return { ok: false, error: "duplicate" };
  }
  const material = await prisma.material.findFirst({
    where: { id: materialId, status: "published" },
    select: { id: true },
  });
  if (!material) return { ok: false, error: "material_not_found" };

  await prisma.$transaction(async (tx) => {
    await tx.specOption.create({ data: { specItemId: itemId, materialId } });
    await writeAudit(tx, {
      orgId: ctx.orgId,
      userId: ctx.userId,
      entityType: AUDIT_ENTITY,
      entityId: itemId,
      action: "add_option",
      diff: { materialId },
    });
  });
  await track(EVENTS.optionAdded, { orgId: ctx.orgId, userId: ctx.userId });
  return { ok: true };
}

export async function removeOption(
  ctx: DesignerContext,
  itemId: string,
  materialId: string,
): Promise<boolean> {
  const item = await loadItem(ctx.orgId, itemId);
  const option = item?.options.find((o) => o.materialId === materialId);
  if (!item || !option) return false;

  await prisma.$transaction(async (tx) => {
    await tx.specOption.delete({ where: { id: option.id } });
    // If we removed the confirmed material, the item is no longer "chosen".
    if (item.confirmedMaterialId === materialId) {
      await tx.specItem.update({
        where: { id: itemId },
        data: { confirmedMaterialId: null },
      });
    }
    await writeAudit(tx, {
      orgId: ctx.orgId,
      userId: ctx.userId,
      entityType: AUDIT_ENTITY,
      entityId: itemId,
      action: "remove_option",
      diff: { materialId },
    });
  });
  return true;
}

export type ConfirmResult =
  | { ok: true }
  | { ok: false; error: "not_found" | "not_an_option" };

export async function confirmMaterial(
  ctx: DesignerContext,
  itemId: string,
  materialId: string,
): Promise<ConfirmResult> {
  const item = await loadItem(ctx.orgId, itemId);
  if (!item) return { ok: false, error: "not_found" };
  if (!isConfirmable(item.options.map((o) => o.materialId), materialId)) {
    return { ok: false, error: "not_an_option" };
  }

  await prisma.$transaction(async (tx) => {
    // Exactly one option is confirmed at a time.
    await tx.specOption.updateMany({
      where: { specItemId: itemId },
      data: { isConfirmed: false },
    });
    await tx.specOption.updateMany({
      where: { specItemId: itemId, materialId },
      data: { isConfirmed: true },
    });
    await tx.specItem.update({
      where: { id: itemId },
      data: { confirmedMaterialId: materialId },
    });
    await writeAudit(tx, {
      orgId: ctx.orgId,
      userId: ctx.userId,
      entityType: AUDIT_ENTITY,
      entityId: itemId,
      action: "confirm",
      diff: { materialId },
    });
  });
  return { ok: true };
}

/** Clear the confirmed material (back to "options" status). */
export async function clearConfirmation(
  ctx: DesignerContext,
  itemId: string,
): Promise<boolean> {
  const item = await loadItem(ctx.orgId, itemId);
  if (!item) return false;

  await prisma.$transaction(async (tx) => {
    await tx.specOption.updateMany({
      where: { specItemId: itemId },
      data: { isConfirmed: false },
    });
    await tx.specItem.update({
      where: { id: itemId },
      data: { confirmedMaterialId: null },
    });
    await writeAudit(tx, {
      orgId: ctx.orgId,
      userId: ctx.userId,
      entityType: AUDIT_ENTITY,
      entityId: itemId,
      action: "unconfirm",
      diff: {},
    });
  });
  return true;
}
