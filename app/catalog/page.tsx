import { auth } from "@/auth";
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
// The "+ Add" button always renders — guests/wrong-role viewers get it as a
// link into the sign-in or designer flow instead of the modal, so the card
// looks identical whether or not you're signed in.
export default async function PublicCatalogPage({ searchParams }: Props) {
  const sp = await searchParams;
  const session = await auth();
  const addFallbackHref = session?.user?.id
    ? "/designer/projects"
    : `/login?callbackUrl=${encodeURIComponent("/catalog")}`;
  const q = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  return (
    <CatalogBrowser
      basePath="/catalog"
      addFallbackHref={addFallbackHref}
      q={q?.trim() || undefined}
      page={Math.max(1, Number(sp.page) || 1)}
      filters={parseCatalogFilters(sp)}
      sort={parseCatalogSort(Array.isArray(sp.sort) ? sp.sort[0] : sp.sort)}
    />
  );
}
