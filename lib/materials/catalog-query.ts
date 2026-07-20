// Catalog filter & sort parameters — pure parsing/normalising helpers shared
// by the catalog UI and the search service (unit-tested).
//
// NEUTRALITY (CLAUDE.md rule #1): the DEFAULT order is always spec relevance /
// data completeness. The sorts below are explicit, user-chosen orderings
// (price, recency, name) — never a paid signal. There is no input here a
// seller can buy.

export const CATALOG_SORTS = [
  "relevance",
  "priceAsc",
  "priceDesc",
  "newest",
  "nameAsc",
] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

export function parseCatalogSort(value: unknown): CatalogSort {
  return CATALOG_SORTS.includes(value as CatalogSort)
    ? (value as CatalogSort)
    : "relevance";
}

export interface CatalogFilters {
  category?: string;
  /** Brand names (exact), multi-select. */
  brands: string[];
  priceMin?: number;
  priceMax?: number;
  /** Only materials with a certification/standard filled in. */
  certOnly: boolean;
  /** Only materials from identity-verified sellers. */
  verifiedOnly: boolean;
}

function parsePrice(value: unknown): number | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

/** Parse URL search params (?brand=a&brand=b&min=..&max=..) into filters. */
export function parseCatalogFilters(params: {
  category?: string | string[];
  brand?: string | string[];
  min?: string | string[];
  max?: string | string[];
  cert?: string | string[];
  verified?: string | string[];
}): CatalogFilters {
  const first = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;
  const many = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v : v ? [v] : []).map((s) => s.trim()).filter(Boolean);

  const category = first(params.category)?.trim() || undefined;
  let priceMin = parsePrice(first(params.min));
  let priceMax = parsePrice(first(params.max));
  // A reversed range is a user slip — treat it as the intended interval.
  if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) {
    [priceMin, priceMax] = [priceMax, priceMin];
  }

  return {
    category,
    brands: [...new Set(many(params.brand))].slice(0, 20),
    priceMin,
    priceMax,
    certOnly: first(params.cert) === "1",
    verifiedOnly: first(params.verified) === "1",
  };
}

/** True when any filter beyond the category preset is active. */
export function hasExtraFilters(f: CatalogFilters): boolean {
  return (
    f.brands.length > 0 ||
    f.priceMin !== undefined ||
    f.priceMax !== undefined ||
    f.certOnly ||
    f.verifiedOnly
  );
}

/** Serialise filters + sort + query back into URL search params. */
export function catalogParams(opts: {
  filters: CatalogFilters;
  sort: CatalogSort;
  q?: string;
  page?: number;
}): URLSearchParams {
  const p = new URLSearchParams();
  const { filters, sort, q, page } = opts;
  if (filters.category) p.set("category", filters.category);
  if (q?.trim()) p.set("q", q.trim());
  for (const b of filters.brands) p.append("brand", b);
  if (filters.priceMin !== undefined) p.set("min", String(filters.priceMin));
  if (filters.priceMax !== undefined) p.set("max", String(filters.priceMax));
  if (filters.certOnly) p.set("cert", "1");
  if (filters.verifiedOnly) p.set("verified", "1");
  if (sort !== "relevance") p.set("sort", sort);
  if (page && page > 1) p.set("page", String(page));
  return p;
}
