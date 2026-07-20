import { auth } from "@/auth";
import { canManageProjects } from "@/lib/permissions";
import { getDesignerContext } from "@/lib/projects/service";
import { CatalogBrowser } from "@/app/_components/catalog-browser";

type Props = {
  searchParams: Promise<{ category?: string; q?: string; page?: string }>;
};

// Designer-workspace catalog — same shared browser as the public /catalog,
// plus the add-to-project actions for managing roles.
export default async function CatalogPage({ searchParams }: Props) {
  const sp = await searchParams;
  const session = await auth();
  const ctx = session?.user?.id ? await getDesignerContext(session.user.id) : null;
  const canManage = !!ctx && canManageProjects(ctx.role);

  return (
    <CatalogBrowser
      basePath="/designer/catalog"
      canManage={canManage}
      category={sp.category?.trim() || undefined}
      q={sp.q?.trim() || undefined}
      page={Math.max(1, Number(sp.page) || 1)}
    />
  );
}
