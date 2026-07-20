import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import type { SellerContext } from "@/lib/seller/context";
import { computeCompleteness } from "./completeness";
import type { EditableMaterialStatus, MaterialFormInput } from "./seller-schemas";

// Seller-side catalog management (ROADMAP 3.3). Completeness is recomputed on
// every save — it's the seller's only lever on default catalog order (rule #1),
// so it must always reflect the data, never be hand-set. Price/status changes
// are audited (ARCHITECTURE #4).

export interface SellerMaterialRow {
  id: string;
  nameTh: string;
  nameEn: string | null;
  model: string | null;
  sku: string | null;
  category: string;
  color: string | null;
  size: string | null;
  price: string | null;
  unit: string | null;
  cert: string | null;
  leadTime: string | null;
  moq: string | null;
  warranty: string | null;
  noteTh: string | null;
  swatchHex: string | null;
  specsheetUrl: string | null;
  status: string;
  completeness: number;
}

const ROW_SELECT = {
  id: true,
  nameTh: true,
  nameEn: true,
  model: true,
  sku: true,
  category: true,
  color: true,
  size: true,
  price: true,
  unit: true,
  cert: true,
  leadTime: true,
  moq: true,
  warranty: true,
  noteTh: true,
  swatchHex: true,
  specsheetUrl: true,
  status: true,
  completeness: true,
} as const;

type Row = Prisma.MaterialGetPayload<{ select: typeof ROW_SELECT }>;

function toRow(m: Row): SellerMaterialRow {
  return {
    ...m,
    price: m.price != null ? m.price.toString() : null,
  };
}

export async function listSellerMaterials(orgId: string): Promise<SellerMaterialRow[]> {
  const rows = await prisma.material.findMany({
    where: { sellerOrgId: orgId },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    select: ROW_SELECT,
  });
  return rows.map(toRow);
}

function formToData(input: MaterialFormInput) {
  const opt = (v: string | undefined) => (v && v.trim() !== "" ? v : null);
  return {
    nameTh: input.nameTh,
    nameEn: opt(input.nameEn),
    model: opt(input.model),
    sku: opt(input.sku),
    category: input.category,
    color: opt(input.color),
    size: opt(input.size),
    price: input.price != null ? new Prisma.Decimal(input.price) : null,
    unit: opt(input.unit),
    cert: opt(input.cert),
    leadTime: opt(input.leadTime),
    moq: opt(input.moq),
    warranty: opt(input.warranty),
    noteTh: opt(input.noteTh),
    swatchHex: opt(input.swatchHex),
    specsheetUrl: opt(input.specsheetUrl),
  };
}

export type SaveMaterialResult =
  | { ok: true; materialId: string; completeness: number }
  | { ok: false; error: "not_found" };

/** Create or update one of the org's materials; recomputes completeness. */
export async function saveMaterial(
  ctx: SellerContext,
  materialId: string | null,
  input: MaterialFormInput,
): Promise<SaveMaterialResult> {
  const data = formToData(input);

  // Score from the saved shape (spec/images unchanged by this form → load
  // current values for them on update, empty on create).
  let existingSpec: unknown = null;
  let existingImages: string[] = [];
  if (materialId) {
    const existing = await prisma.material.findFirst({
      where: { id: materialId, sellerOrgId: ctx.orgId },
      select: { spec: true, images: true },
    });
    if (!existing) return { ok: false, error: "not_found" };
    existingSpec = existing.spec;
    existingImages = existing.images;
  }
  const { score } = computeCompleteness({
    ...data,
    price: input.price ?? null,
    spec: existingSpec,
    images: existingImages,
  });

  const saved = await prisma.$transaction(async (tx) => {
    const material = materialId
      ? await tx.material.update({
          where: { id: materialId },
          data: { ...data, completeness: score },
          select: { id: true },
        })
      : await tx.material.create({
          data: { ...data, sellerOrgId: ctx.orgId, completeness: score },
          select: { id: true },
        });
    await writeAudit(tx, {
      orgId: ctx.orgId,
      userId: ctx.userId,
      entityType: "material",
      entityId: material.id,
      action: materialId ? "update" : "create",
      diff: { price: input.price ?? null, completeness: score },
    });
    return material;
  });
  return { ok: true, materialId: saved.id, completeness: score };
}

export type SetStatusResult = { ok: true } | { ok: false; error: "not_found" };

/** Publish / unpublish (draft|hidden) one of the org's materials. */
export async function setMaterialStatus(
  ctx: SellerContext,
  materialId: string,
  status: EditableMaterialStatus,
): Promise<SetStatusResult> {
  const found = await prisma.material.findFirst({
    where: { id: materialId, sellerOrgId: ctx.orgId },
    select: { id: true },
  });
  if (!found) return { ok: false, error: "not_found" };

  await prisma.$transaction(async (tx) => {
    await tx.material.update({ where: { id: materialId }, data: { status } });
    await writeAudit(tx, {
      orgId: ctx.orgId,
      userId: ctx.userId,
      entityType: "material",
      entityId: materialId,
      action: "status",
      diff: { status },
    });
  });
  return { ok: true };
}
