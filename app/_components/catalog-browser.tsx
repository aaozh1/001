import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { listCategories, searchCatalog } from "@/lib/materials/service";
import { categoryIcon, categoryLabel } from "@/lib/materials/categories";
import { CatalogSearch } from "@/app/(designer)/designer/catalog/_components/catalog-search";
import { MaterialCard } from "@/app/(designer)/designer/catalog/_components/material-card";

// The catalog browse/search surface, shared by the designer workspace
// (/designer/catalog) and the PUBLIC catalog (/catalog). Ranking is the same
// neutral relevance everywhere (rule #1) — only the route prefix and whether
// "add to project" appears differ.
export async function CatalogBrowser({
  basePath,
  canManage,
  category,
  q,
  page,
}: {
  basePath: string;
  canManage: boolean;
  category?: string;
  q?: string;
  page: number;
}) {
  const [t, locale] = await Promise.all([getTranslations("catalog"), getLocale()]);
  const isBrowsing = !category && !q;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-1 text-sub">{t("subtitle")}</p>
        <div className="mt-4 max-w-xl">
          <CatalogSearch basePath={basePath} category={category} initial={q ?? ""} />
          <p className="mt-1.5 text-xs text-mut">{t("neutral")}</p>
        </div>
      </header>

      {isBrowsing ? (
        <CategoryTiles
          basePath={basePath}
          locale={locale}
          chooseLabel={t("chooseCategory")}
          hint={t("categoryHint")}
        />
      ) : (
        <Results
          basePath={basePath}
          category={category}
          q={q}
          page={page}
          locale={locale}
          canManage={canManage}
        />
      )}
    </div>
  );
}

async function CategoryTiles({
  basePath,
  locale,
  chooseLabel,
  hint,
}: {
  basePath: string;
  locale: string;
  chooseLabel: string;
  hint: string;
}) {
  const categories = await listCategories();
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-ink">{chooseLabel}</h2>
        <p className="text-xs text-mut">{hint}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((c) => (
          <Link
            key={c.category}
            href={`${basePath}?category=${encodeURIComponent(c.category)}`}
            className="flex flex-col items-center gap-2 rounded-card border border-line bg-surface p-5 text-center shadow-soft transition hover:-translate-y-0.5 hover:border-brand hover:shadow-lifted"
          >
            <span className="text-2xl text-brand">{categoryIcon(c.category)}</span>
            <span className="text-sm font-medium text-ink">
              {categoryLabel(c.category, locale)}
            </span>
            <span className="text-xs text-mut">{c.count}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

async function Results({
  basePath,
  category,
  q,
  page,
  locale,
  canManage,
}: {
  basePath: string;
  category?: string;
  q?: string;
  page: number;
  locale: string;
  canManage: boolean;
}) {
  const t = await getTranslations("catalog");
  const result = await searchCatalog({ category, query: q, page });
  const heading = category ? categoryLabel(category, locale) : t("allCategories");
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <Link href={basePath} className="text-sm text-sub hover:text-ink">
          {t("backCatalog")}
        </Link>
        <span className="text-sm text-sub">
          {heading} · {result.total} {t("items")}
        </span>
      </div>

      {result.materials.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-2 bg-surface p-10 text-center text-sub">
          {t("noResults")}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {result.materials.map((m) => (
            <MaterialCard
              key={m.id}
              m={m}
              locale={locale}
              canManage={canManage}
              basePath={basePath}
            />
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-3 text-sm">
          <PageLink basePath={basePath} category={category} q={q} page={page - 1} disabled={page <= 1}>
            {t("prev")}
          </PageLink>
          <span className="text-sub">
            {page} / {pageCount}
          </span>
          <PageLink
            basePath={basePath}
            category={category}
            q={q}
            page={page + 1}
            disabled={page >= pageCount}
          >
            {t("next")}
          </PageLink>
        </nav>
      )}
    </section>
  );
}

function PageLink({
  basePath,
  category,
  q,
  page,
  disabled,
  children,
}: {
  basePath: string;
  category?: string;
  q?: string;
  page: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return <span className="cursor-default text-mut opacity-50">{children}</span>;
  }
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return (
    <Link href={`${basePath}${qs ? `?${qs}` : ""}`} className="text-brand hover:underline">
      {children}
    </Link>
  );
}
