import { CatalogBrowser } from "@/app/_components/catalog-browser";
import {
  parseCatalogFilters,
  parseCatalogSort,
} from "@/lib/materials/catalog-query";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// PUBLIC catalog — browse and search without an account. Same neutral ranking
// as everywhere else (rule #1); adding to a project needs a designer login.
export default async function PublicCatalogPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  return (
    <CatalogBrowser
      basePath="/catalog"
      canManage={false}
      q={q?.trim() || undefined}
      page={Math.max(1, Number(sp.page) || 1)}
      filters={parseCatalogFilters(sp)}
      sort={parseCatalogSort(Array.isArray(sp.sort) ? sp.sort[0] : sp.sort)}
    />
  );
}
