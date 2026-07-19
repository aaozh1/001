import { Prisma } from "@prisma/client";

// Shape of a source project needed to duplicate its *structure* (the spec
// skeleton), read from the DB by the service layer.
export interface DuplicableProject {
  name: string;
  buildingType: string | null;
  specItems: {
    code: string;
    zone: string | null;
    category: string | null;
    qty: Prisma.Decimal | null;
    qtyUnit: string | null;
    confirmedMaterialId: string | null;
    sortOrder: number;
    options: { materialId: string; isConfirmed: boolean }[];
  }[];
}

/**
 * Build the nested `create` payload for a duplicated project. Copies the spec
 * skeleton — items, their order, material options and confirmed choice — but
 * deliberately NOT the transactional history (RFQs, quotes, VE history, spec
 * books, audit). Duplicating gives a fresh, reusable project (status reset to
 * `active`); pure so it is unit-tested without a database.
 */
export function buildDuplicateData(
  source: DuplicableProject,
  target: { orgId: string; name: string; createdById?: string | null },
): Prisma.ProjectCreateInput {
  return {
    org: { connect: { id: target.orgId } },
    name: target.name,
    buildingType: source.buildingType,
    status: "active",
    ...(target.createdById
      ? { createdBy: { connect: { id: target.createdById } } }
      : {}),
    specItems: {
      create: source.specItems.map((item) => ({
        code: item.code,
        zone: item.zone,
        category: item.category,
        qty: item.qty,
        qtyUnit: item.qtyUnit,
        confirmedMaterialId: item.confirmedMaterialId,
        sortOrder: item.sortOrder,
        options: {
          create: item.options.map((o) => ({
            materialId: o.materialId,
            isConfirmed: o.isConfirmed,
          })),
        },
      })),
    },
  };
}

/** Default name for a duplicate, localized copy-suffix handled in the UI. */
export function duplicateName(original: string, copySuffix = "copy"): string {
  return `${original} (${copySuffix})`;
}
