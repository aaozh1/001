import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { rankMaterials } from "./relevance";
import type { CatalogFilters, CatalogSort } from "./catalog-query";

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
  // Extra facts for the table/compare views (ปรับ field column ได้).
  cert: string | null;
  leadTime: string | null;
  warranty: string | null;
  moq: string | null;
  size: string | null;
  color: string | null;
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
  cert: true,
  leadTime: true,
  warranty: true,
  moq: true,
  size: true,
  color: true,
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
    cert: m.cert,
    leadTime: m.leadTime,
    warranty: m.warranty,
    moq: m.moq,
    size: m.size,
    color: m.color,
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

// Fetch cap before in-memory ranking. Sized above the demo catalog (~1,000
// items) so browsing never silently truncates; at real scale this moves to a
// search index, but the neutral ordering rule stays identical.
const RANK_CAP = 3000;

function catalogWhere(opts: {
  query?: string;
  category?: string;
  filters?: CatalogFilters;
}): Prisma.MaterialWhereInput {
  const query = opts.query?.trim() ?? "";
  const f = opts.filters;
  const where: Prisma.MaterialWhereInput = { status: "published" };
  const category = f?.category ?? opts.category;
  if (category) where.category = category;
  if (query) {
    where.OR = [
      { nameTh: { contains: query, mode: "insensitive" } },
      { nameEn: { contains: query, mode: "insensitive" } },
      { model: { contains: query, mode: "insensitive" } },
      { sku: { contains: query, mode: "insensitive" } },
      { brand: { name: { contains: query, mode: "insensitive" } } },
    ];
  }
  if (f) {
    if (f.brands.length > 0) where.brand = { name: { in: f.brands } };
    if (f.priceMin !== undefined || f.priceMax !== undefined) {
      where.price = {
        ...(f.priceMin !== undefined ? { gte: f.priceMin } : {}),
        ...(f.priceMax !== undefined ? { lte: f.priceMax } : {}),
      };
    }
    if (f.certOnly) where.cert = { not: null, notIn: ["", "—"] };
    if (f.verifiedOnly) where.seller = { verified: true };
  }
  return where;
}

// Explicit user-chosen orderings (never a paid signal — rule #1). Relevance is
// handled separately via rankMaterials.
const SORT_ORDER: Record<
  Exclude<CatalogSort, "relevance">,
  Prisma.MaterialOrderByWithRelationInput[]
> = {
  priceAsc: [{ price: { sort: "asc", nulls: "last" } }, { nameTh: "asc" }],
  priceDesc: [{ price: { sort: "desc", nulls: "last" } }, { nameTh: "asc" }],
  newest: [{ createdAt: "desc" }, { nameTh: "asc" }],
  nameAsc: [{ nameTh: "asc" }],
};

export async function searchCatalog(opts: {
  query?: string;
  category?: string;
  filters?: CatalogFilters;
  sort?: CatalogSort;
  page?: number;
  pageSize?: number;
}): Promise<CatalogResult> {
  const query = opts.query?.trim() ?? "";
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(opts.pageSize ?? 24, 60);
  const sort = opts.sort ?? "relevance";
  const where = catalogWhere(opts);

  if (sort !== "relevance") {
    // Deterministic user-chosen sort — paginate in the database.
    const [rows, total] = await Promise.all([
      prisma.material.findMany({
        where,
        select: SELECT,
        orderBy: SORT_ORDER[sort],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.material.count({ where }),
    ]);
    return { materials: rows.map(toSummary), total, page, pageSize };
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

export interface BrandFacet {
  name: string;
  count: number;
}

/** Brand names (with counts) available in a category — for the filter panel.
 *  Ordered by count then name: an availability fact, not a ranking. */
export async function listBrandFacets(category?: string): Promise<BrandFacet[]> {
  const groups = await prisma.material.groupBy({
    by: ["brandId"],
    where: { status: "published", ...(category ? { category } : {}), brandId: { not: null } },
    _count: { _all: true },
  });
  const ids = groups.map((g) => g.brandId).filter((v): v is string => Boolean(v));
  const brands = await prisma.brand.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
  const nameById = new Map(brands.map((b) => [b.id, b.name]));
  return groups
    .map((g) => ({ name: nameById.get(g.brandId ?? "") ?? "", count: g._count._all }))
    .filter((b) => b.name)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 40);
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
