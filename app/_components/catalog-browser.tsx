import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { cn } from "@/lib/ui/cn";
import {
  listBrandFacets,
  listCategories,
  searchCatalog,
} from "@/lib/materials/service";
import {
  type CatalogFilters,
  type CatalogSort,
  catalogParams,
} from "@/lib/materials/catalog-query";
import { categoryIcon, categoryLabel } from "@/lib/materials/categories";
import { CatalogSearch } from "@/app/(designer)/designer/catalog/_components/catalog-search";
import { CatalogFilterBar } from "@/app/_components/catalog-filter-bar";
import { CatalogResults } from "@/app/_components/catalog-results";

// The catalog browse/search surface, shared by the designer workspace
// (/designer/catalog) and the PUBLIC catalog (/catalog). Products show
// IMMEDIATELY (ความ open ของแพลตฟอร์ม); a category page is just this surface
// with the category filter pre-set. Ranking is the same neutral relevance
// everywhere (rule #1) — only the route prefix and whether "add to project"
// appears differ.
export async function CatalogBrowser({
  basePath,
  canManage,
  q,
  page,
  filters,
  sort,
}: {
  basePath: string;
  canManage: boolean;
  q?: string;
  page: number;
  filters: CatalogFilters;
  sort: CatalogSort;
}) {
  const [t, locale] = await Promise.all([getTranslations("catalog"), getLocale()]);
  const [result, categories, brands] = await Promise.all([
    searchCatalog({ query: q, filters, sort, page, trackSearch: true }),
    listCategories(),
    listBrandFacets(filters.category),
  ]);
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));
  const heading = filters.category
    ? categoryLabel(filters.category, locale)
    : t("allCategories");

  // A category chip keeps the query/sort but resets other filters — switching
  // family means the brand/price context no longer applies.
  const chipHref = (category?: string) => {
    const p = catalogParams({
      filters: {
        category,
        brands: [],
        certOnly: false,
        verifiedOnly: false,
      },
      sort,
      q,
    });
    return `${basePath}${p.size ? `?${p}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-1 text-sub">{t("subtitle")}</p>
        <div className="mt-4 max-w-xl">
          <CatalogSearch basePath={basePath} category={filters.category} initial={q ?? ""} />
          <p className="mt-1.5 font-mono text-[11.5px] text-mut">{t("neutral")}</p>
        </div>
      </header>

      {/* Category strip — the per-family "small buttons"; each is a preset
          filter the user can keep adjusting. */}
      <nav aria-label={t("chooseCategory")} className="mb-3 flex flex-wrap gap-1.5">
        <CategoryChip href={chipHref(undefined)} active={!filters.category}>
          {t("allCategories")} · {categories.reduce((s, c) => s + c.count, 0)}
        </CategoryChip>
        {categories.map((c) => (
          <CategoryChip
            key={c.category}
            href={chipHref(c.category)}
            active={filters.category === c.category}
          >
            {categoryIcon(c.category)} {categoryLabel(c.category, locale)} · {c.count}
          </CategoryChip>
        ))}
      </nav>

      <div className="mb-4 rounded-card border border-line bg-surface p-3 shadow-soft">
        <CatalogFilterBar
          basePath={basePath}
          q={q}
          sort={sort}
          filters={filters}
          brands={brands}
        />
      </div>

      <div className="mb-3 text-sm text-sub">
        {heading} · {result.total} {t("items")}
      </div>

      {result.materials.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-2 bg-surface p-10 text-center text-sub">
          {t("noResults")}
        </p>
      ) : (
        <CatalogResults
          materials={result.materials}
          locale={locale}
          canManage={canManage}
          basePath={basePath}
        />
      )}

      {pageCount > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-3 text-sm">
          <PageLink
            basePath={basePath}
            filters={filters}
            sort={sort}
            q={q}
            page={page - 1}
            disabled={page <= 1}
          >
            {t("prev")}
          </PageLink>
          <span className="text-sub">
            {page} / {pageCount}
          </span>
          <PageLink
            basePath={basePath}
            filters={filters}
            sort={sort}
            q={q}
            page={page + 1}
            disabled={page >= pageCount}
          >
            {t("next")}
          </PageLink>
        </nav>
      )}
    </div>
  );
}

function CategoryChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "rounded-pill border px-2.5 py-1 text-[13px] transition",
        active
          ? "border-brand bg-brand font-medium text-white"
          : "border-line-2 bg-surface text-sub hover:border-brand hover:text-brand",
      )}
    >
      {children}
    </Link>
  );
}

function PageLink({
  basePath,
  filters,
  sort,
  q,
  page,
  disabled,
  children,
}: {
  basePath: string;
  filters: CatalogFilters;
  sort: CatalogSort;
  q?: string;
  page: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return <span className="cursor-default text-mut opacity-50">{children}</span>;
  }
  const p = catalogParams({ filters, sort, q, page });
  return (
    <Link href={`${basePath}${p.size ? `?${p}` : ""}`} className="text-brand hover:underline">
      {children}
    </Link>
  );
}
