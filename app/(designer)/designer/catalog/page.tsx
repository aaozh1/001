import { auth } from "@/auth";
import { canManageProjects } from "@/lib/permissions";
import { getDesignerContext } from "@/lib/projects/service";
import { CatalogBrowser } from "@/app/_components/catalog-browser";
import {
  parseCatalogFilters,
  parseCatalogSort,
} from "@/lib/materials/catalog-query";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Designer-workspace catalog — same shared browser as the public /catalog,
// plus the add-to-project actions for managing roles.
export default async function CatalogPage({ searchParams }: Props) {
  const sp = await searchParams;
  const session = await auth();
  const ctx = session?.user?.id ? await getDesignerContext(session.user.id) : null;
  const canManage = !!ctx && canManageProjects(ctx.role);
  const addFallbackHref = canManage
    ? undefined
    : session?.user?.id
      ? "/designer/projects"
      : `/login?callbackUrl=${encodeURIComponent("/designer/catalog")}`;
  const q = Array.isArray(sp.q) ? sp.q[0] : sp.q;

  return (
    <CatalogBrowser
      basePath="/designer/catalog"
      addFallbackHref={addFallbackHref}
      q={q?.trim() || undefined}
      page={Math.max(1, Number(sp.page) || 1)}
      filters={parseCatalogFilters(sp)}
      sort={parseCatalogSort(Array.isArray(sp.sort) ? sp.sort[0] : sp.sort)}
    />
  );
}
