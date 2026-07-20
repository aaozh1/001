"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/ui/cn";
import {
  type CatalogFilters,
  type CatalogSort,
  CATALOG_SORTS,
  catalogParams,
  hasExtraFilters,
} from "@/lib/materials/catalog-query";

export interface BrandFacetView {
  name: string;
  count: number;
}

// Detailed filter + sort bar for the catalog. Everything is URL-driven so the
// server re-queries; a category page is just this bar with the category
// filter pre-set (ปรับต่อได้ทันที). Default order stays neutral relevance.
export function CatalogFilterBar({
  basePath,
  q,
  sort,
  filters,
  brands,
}: {
  basePath: string;
  q?: string;
  sort: CatalogSort;
  filters: CatalogFilters;
  brands: BrandFacetView[];
}) {
  const t = useTranslations("catalog");
  const router = useRouter();
  const [brandOpen, setBrandOpen] = useState(false);
  const [min, setMin] = useState(filters.priceMin?.toString() ?? "");
  const [max, setMax] = useState(filters.priceMax?.toString() ?? "");
  const brandRef = useRef<HTMLDivElement>(null);

  // Keep the price inputs in sync when the URL changes from elsewhere.
  useEffect(() => setMin(filters.priceMin?.toString() ?? ""), [filters.priceMin]);
  useEffect(() => setMax(filters.priceMax?.toString() ?? ""), [filters.priceMax]);

  useEffect(() => {
    if (!brandOpen) return;
    function onDown(e: MouseEvent) {
      if (!brandRef.current?.contains(e.target as Node)) setBrandOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [brandOpen]);

  function apply(next: Partial<CatalogFilters>, nextSort?: CatalogSort) {
    const p = catalogParams({
      filters: { ...filters, ...next },
      sort: nextSort ?? sort,
      q,
    });
    router.push(`${basePath}${p.size ? `?${p}` : ""}`);
  }

  function applyPrice() {
    const parse = (v: string) => {
      const n = Number(v);
      return v.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : undefined;
    };
    apply({ priceMin: parse(min), priceMax: parse(max) });
  }

  function toggleBrand(name: string) {
    const has = filters.brands.includes(name);
    apply({
      brands: has
        ? filters.brands.filter((b) => b !== name)
        : [...filters.brands, name],
    });
  }

  const sel =
    "rounded-sm border border-line-2 bg-surface px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-brand";
  const toggleCls = (on: boolean) =>
    cn(
      "rounded-pill border px-2.5 py-1.5 text-[13px] transition",
      on
        ? "border-brand bg-brand-soft font-medium text-brand"
        : "border-line-2 text-sub hover:border-brand hover:text-brand",
    );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Sort — explicit user choice; default stays neutral relevance. */}
      <label className="flex items-center gap-1.5 text-[13px] text-sub">
        {t("sortLabel")}
        <select
          value={sort}
          onChange={(e) => apply({}, e.target.value as CatalogSort)}
          className={sel}
          aria-label={t("sortLabel")}
        >
          {CATALOG_SORTS.map((s) => (
            <option key={s} value={s}>
              {t(`sort_${s}`)}
            </option>
          ))}
        </select>
      </label>

      {/* Brand multi-select */}
      <div ref={brandRef} className="relative">
        <button
          type="button"
          onClick={() => setBrandOpen((v) => !v)}
          aria-expanded={brandOpen}
          className={toggleCls(filters.brands.length > 0)}
        >
          {t("brandFilter")}
          {filters.brands.length > 0 ? ` · ${filters.brands.length}` : ""} ▾
        </button>
        {brandOpen && (
          <div className="absolute left-0 top-full z-20 mt-1 max-h-72 w-64 overflow-y-auto rounded-card border border-line bg-surface p-2 shadow-lifted">
            {brands.length === 0 ? (
              <p className="px-2 py-1.5 text-xs text-mut">{t("noBrands")}</p>
            ) : (
              brands.map((b) => (
                <label
                  key={b.name}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-ink hover:bg-canvas"
                >
                  <input
                    type="checkbox"
                    checked={filters.brands.includes(b.name)}
                    onChange={() => toggleBrand(b.name)}
                    className="h-4 w-4 accent-brand"
                  />
                  <span className="min-w-0 flex-1 truncate">{b.name}</span>
                  <span className="text-xs text-mut">{b.count}</span>
                </label>
              ))
            )}
          </div>
        )}
      </div>

      {/* Price range */}
      <div className="flex items-center gap-1 text-[13px] text-sub">
        <span>฿</span>
        <input
          value={min}
          onChange={(e) => setMin(e.target.value)}
          onBlur={applyPrice}
          onKeyDown={(e) => e.key === "Enter" && applyPrice()}
          placeholder={t("priceMin")}
          inputMode="numeric"
          className={cn(sel, "w-20")}
          aria-label={t("priceMin")}
        />
        <span>–</span>
        <input
          value={max}
          onChange={(e) => setMax(e.target.value)}
          onBlur={applyPrice}
          onKeyDown={(e) => e.key === "Enter" && applyPrice()}
          placeholder={t("priceMax")}
          inputMode="numeric"
          className={cn(sel, "w-20")}
          aria-label={t("priceMax")}
        />
      </div>

      <button
        type="button"
        onClick={() => apply({ certOnly: !filters.certOnly })}
        aria-pressed={filters.certOnly}
        className={toggleCls(filters.certOnly)}
      >
        ✓ {t("certOnly")}
      </button>
      <button
        type="button"
        onClick={() => apply({ verifiedOnly: !filters.verifiedOnly })}
        aria-pressed={filters.verifiedOnly}
        className={toggleCls(filters.verifiedOnly)}
      >
        ✓ {t("verifiedOnly")}
      </button>

      {(hasExtraFilters(filters) || sort !== "relevance") && (
        <button
          type="button"
          onClick={() =>
            apply(
              {
                brands: [],
                priceMin: undefined,
                priceMax: undefined,
                certOnly: false,
                verifiedOnly: false,
              },
              "relevance",
            )
          }
          className="text-[13px] text-mut underline-offset-2 hover:text-brand hover:underline"
        >
          ✕ {t("clearFilters")}
        </button>
      )}
    </div>
  );
}
