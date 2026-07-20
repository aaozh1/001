import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { rankMaterials } from "./relevance";

// Catalog reads. NEUTRALITY (CLAUDE.md rule #1): every ordering here goes through
// rankMaterials — spec relevance then data completeness, never a paid signal.

export interface MaterialSummary {
  id: string;
  nameTh: string;
  nameEn: string | null;
  brand: string | null;
  model: string | null;
  sku: string | null;
  category: string;
  swatchHex: string | null;
  price: string | null;
  unit: string | null;
  completeness: number;
  specTh: string | null;
  specEn: string | null;
}

const SELECT = {
  id: true,
  nameTh: true,
  nameEn: true,
  model: true,
  sku: true,
  category: true,
  swatchHex: true,
  price: true,
  unit: true,
  completeness: true,
  spec: true,
  brand: { select: { name: true } },
} satisfies Prisma.MaterialSelect;

type Row = Prisma.MaterialGetPayload<{ select: typeof SELECT }>;

function specText(spec: Prisma.JsonValue | null, key: "summary_th" | "summary_en"): string | null {
  if (spec && typeof spec === "object" && !Array.isArray(spec)) {
    const v = (spec as Record<string, unknown>)[key];
    return typeof v === "string" ? v : null;
  }
  return null;
}

function toSummary(m: Row): MaterialSummary {
  return {
    id: m.id,
    nameTh: m.nameTh,
    nameEn: m.nameEn,
    brand: m.brand?.name ?? null,
    model: m.model,
    sku: m.sku,
    category: m.category,
    swatchHex: m.swatchHex,
    price: m.price ? m.price.toString() : null,
    unit: m.unit,
    completeness: m.completeness,
    specTh: specText(m.spec, "summary_th"),
    specEn: specText(m.spec, "summary_en"),
  };
}

/** Distinct published categories with their material counts. */
export async function listCategories(): Promise<{ category: string; count: number }[]> {
  const groups = await prisma.material.groupBy({
    by: ["category"],
    where: { status: "published" },
    _count: { _all: true },
    orderBy: { category: "asc" },
  });
  return groups.map((g) => ({ category: g.category, count: g._count._all }));
}

export interface CatalogResult {
  materials: MaterialSummary[];
  total: number;
  page: number;
  pageSize: number;
}

// Fetch cap before in-memory ranking. The seed catalog is tiny; at real scale
// this moves to a search index, but the neutral ordering rule stays identical.
const RANK_CAP = 500;

export async function searchCatalog(opts: {
  query?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}): Promise<CatalogResult> {
  const query = opts.query?.trim() ?? "";
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(opts.pageSize ?? 24, 60);

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

  // Deterministic order for the rank pool: without it, WHICH rows fall inside
  // the cap is arbitrary DB order — silently non-neutral once a query matches
  // more than RANK_CAP rows (rule #1). Stable id order at least makes the
  // pool reproducible; the real fix at scale is DB-side relevance (Phase 4).
  const rows = await prisma.material.findMany({
    where,
    select: SELECT,
    orderBy: { id: "asc" },
    take: RANK_CAP,
  });
  const ranked = rankMaterials(rows.map(toSummary), query);
  const start = (page - 1) * pageSize;
  return {
    materials: ranked.slice(start, start + pageSize),
    total: ranked.length,
    page,
    pageSize,
  };
}

export interface MaterialDetail {
  id: string;
  nameTh: string;
  nameEn: string | null;
  brand: string | null;
  model: string | null;
  sku: string | null;
  category: string;
  color: string | null;
  size: string | null;
  price: string | null;
  unit: string | null;
  swatchHex: string | null;
  cert: string | null;
  leadTime: string | null;
  moq: string | null;
  warranty: string | null;
  noteTh: string | null;
  noteEn: string | null;
  specsheetUrl: string | null;
  catalogUrl: string | null;
  specTh: string | null;
  specEn: string | null;
  seller: { id: string; name: string; verified: boolean } | null;
  related: MaterialSummary[];
}

export async function getMaterialDetail(id: string): Promise<MaterialDetail | null> {
  const m = await prisma.material.findFirst({
    where: { id, status: "published" },
    include: {
      brand: { select: { name: true } },
      seller: { select: { id: true, name: true, verified: true } },
    },
  });
  if (!m) return null;

  const relatedRows = await prisma.material.findMany({
    where: { status: "published", category: m.category, id: { not: m.id } },
    select: SELECT,
    take: 30,
  });
  const related = rankMaterials(relatedRows.map(toSummary), "").slice(0, 6);

  return {
    id: m.id,
    nameTh: m.nameTh,
    nameEn: m.nameEn,
    brand: m.brand?.name ?? null,
    model: m.model,
    sku: m.sku,
    category: m.category,
    color: m.color,
    size: m.size,
    price: m.price ? m.price.toString() : null,
    unit: m.unit,
    swatchHex: m.swatchHex,
    cert: m.cert,
    leadTime: m.leadTime,
    moq: m.moq,
    warranty: m.warranty,
    noteTh: m.noteTh,
    noteEn: m.noteEn,
    specsheetUrl: m.specsheetUrl,
    catalogUrl: m.catalogUrl,
    specTh: specText(m.spec, "summary_th"),
    specEn: specText(m.spec, "summary_en"),
    seller: m.seller
      ? { id: m.seller.id, name: m.seller.name, verified: m.seller.verified }
      : null,
    related,
  };
}

export async function listSellerMaterials(sellerOrgId: string): Promise<MaterialSummary[]> {
  const rows = await prisma.material.findMany({
    where: { status: "published", sellerOrgId },
    select: SELECT,
    take: RANK_CAP,
  });
  return rankMaterials(rows.map(toSummary), "");
}

/** Summaries for a set of material ids (renders an item's current options). */
export async function getMaterialsByIds(
  ids: string[],
): Promise<Map<string, MaterialSummary>> {
  if (ids.length === 0) return new Map();
  const rows = await prisma.material.findMany({ where: { id: { in: ids } }, select: SELECT });
  return new Map(rows.map((m) => [m.id, toSummary(m)]));
}

/** Neutral list for the option picker (delegates to the ranked catalog). */
export async function listMaterialsForPicker(opts: {
  query?: string;
  category?: string;
  limit?: number;
}): Promise<MaterialSummary[]> {
  const result = await searchCatalog({
    query: opts.query,
    category: opts.category,
    pageSize: opts.limit ?? 30,
  });
  return result.materials;
}
