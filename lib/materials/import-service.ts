import "server-only";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import type { SellerContext } from "@/lib/seller/context";
import { computeCompleteness } from "./completeness";

// Bulk import of seller materials (จากไฟล์ catalog / material sheet). Every
// imported row becomes a DRAFT — nothing reaches the public catalog until the
// seller reviews and publishes it (neutral ranking stays data-driven, rule #1).

export const MAX_IMPORT_ROWS = 200;

export const importRowSchema = z.object({
  nameTh: z.string().trim().min(1).max(160),
  nameEn: z.string().trim().max(160).optional().default(""),
  brand: z.string().trim().max(80).optional().default(""),
  model: z.string().trim().max(120).optional().default(""),
  sku: z.string().trim().max(80).optional().default(""),
  category: z.string().trim().min(1).max(80),
  price: z
    .union([z.coerce.number().min(0).max(1_000_000_000), z.literal(""), z.null()])
    .optional(),
  unit: z.string().trim().max(40).optional().default(""),
  size: z.string().trim().max(120).optional().default(""),
  color: z.string().trim().max(120).optional().default(""),
  cert: z.string().trim().max(160).optional().default(""),
  leadTime: z.string().trim().max(120).optional().default(""),
  warranty: z.string().trim().max(120).optional().default(""),
  note: z.string().trim().max(500).optional().default(""),
});
export type ImportRow = z.infer<typeof importRowSchema>;

export const importRowsSchema = z.array(importRowSchema).min(1).max(MAX_IMPORT_ROWS);

export interface BulkImportResult {
  created: number;
  brandsCreated: number;
  materialIds: string[];
}

/** Create draft materials in bulk. Brands referenced by name are resolved in
 *  the seller's own org (created there when new). One audit entry per run. */
export async function createDraftMaterials(
  ctx: SellerContext,
  rows: ImportRow[],
): Promise<BulkImportResult> {
  // Resolve brand names → own-org brand ids (case-insensitive, create missing).
  const wanted = [...new Set(rows.map((r) => r.brand.trim()).filter(Boolean))];
  const existing = wanted.length
    ? await prisma.brand.findMany({
        where: { sellerOrgId: ctx.orgId, name: { in: wanted, mode: "insensitive" } },
        select: { id: true, name: true },
      })
    : [];
  const brandIdByName = new Map(existing.map((b) => [b.name.toLowerCase(), b.id]));
  let brandsCreated = 0;
  for (const name of wanted) {
    if (brandIdByName.has(name.toLowerCase())) continue;
    const b = await prisma.brand.create({
      data: { sellerOrgId: ctx.orgId, name },
      select: { id: true },
    });
    brandIdByName.set(name.toLowerCase(), b.id);
    brandsCreated++;
  }

  const opt = (v: string) => (v.trim() !== "" ? v.trim() : null);
  const materialIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      const price =
        row.price === "" || row.price == null ? null : (row.price as number);
      const data = {
        sellerOrgId: ctx.orgId,
        brandId: row.brand ? (brandIdByName.get(row.brand.toLowerCase()) ?? null) : null,
        nameTh: row.nameTh,
        nameEn: opt(row.nameEn),
        model: opt(row.model),
        sku: opt(row.sku),
        category: row.category,
        color: opt(row.color),
        size: opt(row.size),
        price: price != null ? new Prisma.Decimal(price) : null,
        unit: opt(row.unit),
        cert: opt(row.cert),
        leadTime: opt(row.leadTime),
        moq: null,
        warranty: opt(row.warranty),
        noteTh: opt(row.note),
        status: "draft" as const,
      };
      const { score } = computeCompleteness({
        ...data,
        price,
        spec: null,
        images: [],
        swatchHex: null,
        specsheetUrl: null,
      });
      const created = await tx.material.create({
        data: { ...data, completeness: score },
        select: { id: true },
      });
      materialIds.push(created.id);
    }
    await writeAudit(tx, {
      orgId: ctx.orgId,
      userId: ctx.userId,
      entityType: "material",
      entityId: "bulk_import",
      action: "bulk_import",
      diff: { created: materialIds.length, brandsCreated },
    });
  });

  return { created: materialIds.length, brandsCreated, materialIds };
}
