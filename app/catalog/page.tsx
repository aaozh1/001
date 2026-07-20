import { CatalogBrowser } from "@/app/_components/catalog-browser";

type Props = {
  searchParams: Promise<{ category?: string; q?: string; page?: string }>;
};

// PUBLIC catalog — browse and search without an account. Same neutral ranking
// as everywhere else (rule #1); adding to a project needs a designer login.
export default async function PublicCatalogPage({ searchParams }: Props) {
  const sp = await searchParams;
  return (
    <CatalogBrowser
      basePath="/catalog"
      canManage={false}
      category={sp.category?.trim() || undefined}
      q={sp.q?.trim() || undefined}
      page={Math.max(1, Number(sp.page) || 1)}
    />
  );
}
