import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Catalog reads for the option picker. NEUTRALITY (CLAUDE.md rule #1): results
// are ordered ONLY by data completeness then name — never by any paid signal.
// The full spec-relevance ranking + filters land in Phase 1.4; this is the
// minimal neutral slice 1.3 needs to attach options.

export interface MaterialSummary {
  id: string;
  nameTh: string;
  nameEn: string | null;
  brand: string | null;
  model: string | null;
  category: string;
  swatchHex: string | null;
  price: string | null;
  unit: string | null;
}

const SELECT = {
  id: true,
  nameTh: true,
  nameEn: true,
  model: true,
  category: true,
  swatchHex: true,
  price: true,
  unit: true,
  brand: { select: { name: true } },
} satisfies Prisma.MaterialSelect;

type Row = Prisma.MaterialGetPayload<{ select: typeof SELECT }>;

function toSummary(m: Row): MaterialSummary {
  return {
    id: m.id,
    nameTh: m.nameTh,
    nameEn: m.nameEn,
    brand: m.brand?.name ?? null,
    model: m.model,
    category: m.category,
    swatchHex: m.swatchHex,
    price: m.price ? m.price.toString() : null,
    unit: m.unit,
  };
}

export async function listMaterialsForPicker(opts: {
  query?: string;
  category?: string;
  limit?: number;
}): Promise<MaterialSummary[]> {
  const query = opts.query?.trim();
  const where: Prisma.MaterialWhereInput = { status: "published" };
  if (opts.category) where.category = opts.category;
  if (query) {
    where.OR = [
      { nameTh: { contains: query, mode: "insensitive" } },
      { nameEn: { contains: query, mode: "insensitive" } },
      { model: { contains: query, mode: "insensitive" } },
      { sku: { contains: query, mode: "insensitive" } },
      { brand: { name: { contains: query, mode: "insensitive" } } },
    ];
  }

  const rows = await prisma.material.findMany({
    where,
    select: SELECT,
    // Neutral ordering — data richness, then name. No paid ranking (rule #1).
    orderBy: [{ completeness: "desc" }, { nameTh: "asc" }],
    take: Math.min(opts.limit ?? 30, 100),
  });
  return rows.map(toSummary);
}

/** Summaries for a set of material ids (to render an item's current options). */
export async function getMaterialsByIds(
  ids: string[],
): Promise<Map<string, MaterialSummary>> {
  if (ids.length === 0) return new Map();
  const rows = await prisma.material.findMany({
    where: { id: { in: ids } },
    select: SELECT,
  });
  return new Map(rows.map((m) => [m.id, toSummary(m)]));
}
