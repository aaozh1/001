import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import type { DesignerContext } from "@/lib/projects/service";
import {
  fingerprintHeader,
  isValidMapping,
  rowsToItems,
  type ColumnMapping,
} from "./parse";

export async function getSavedMapping(
  orgId: string,
  fingerprint: string,
): Promise<ColumnMapping | null> {
  const row = await prisma.importMapping.findUnique({
    where: { orgId_fingerprint: { orgId, fingerprint } },
    select: { mapping: true },
  });
  return row ? (row.mapping as ColumnMapping) : null;
}

async function saveMapping(
  db: Prisma.TransactionClient,
  orgId: string,
  fingerprint: string,
  mapping: ColumnMapping,
) {
  await db.importMapping.upsert({
    where: { orgId_fingerprint: { orgId, fingerprint } },
    create: { orgId, fingerprint, mapping: mapping as Prisma.InputJsonValue },
    update: { mapping: mapping as Prisma.InputJsonValue },
  });
}

function toDecimal(qty: string): Prisma.Decimal | null {
  const t = qty.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? new Prisma.Decimal(n) : null;
}

export type ImportResult =
  | { ok: true; projectId: string; itemCount: number }
  | { ok: false; error: "invalid_mapping" | "empty" };

/** Create a project from imported rows and remember the column mapping. */
export async function createProjectFromImport(
  ctx: DesignerContext,
  input: {
    name: string;
    buildingType?: string | null;
    header: string[];
    rows: string[][];
    mapping: ColumnMapping;
  },
): Promise<ImportResult> {
  if (!isValidMapping(input.mapping)) return { ok: false, error: "invalid_mapping" };
  const items = rowsToItems(input.rows, input.mapping);
  if (items.length === 0) return { ok: false, error: "empty" };

  const fingerprint = fingerprintHeader(input.header);

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        orgId: ctx.orgId,
        name: input.name,
        buildingType: input.buildingType ?? null,
        createdById: ctx.userId,
        specItems: {
          create: items.map((it, i) => ({
            code: it.code,
            zone: it.zone || null,
            category: it.category || null,
            qty: toDecimal(it.qty),
            qtyUnit: it.qtyUnit || null,
            sortOrder: i,
          })),
        },
      },
    });
    await saveMapping(tx, ctx.orgId, fingerprint, input.mapping);
    await writeAudit(tx, {
      orgId: ctx.orgId,
      userId: ctx.userId,
      entityType: "project",
      entityId: created.id,
      action: "import",
      diff: { name: created.name, itemCount: items.length },
    });
    return created;
  });

  return { ok: true, projectId: project.id, itemCount: items.length };
}
