import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { canManageMaterials, getSellerContext } from "@/lib/seller/context";
import { listSellerMaterials } from "@/lib/materials/seller-service";
import { listBrands } from "@/lib/seller/brand-service";
import { CATEGORY_META, categoryLabel } from "@/lib/materials/categories";
import { MaterialsClient } from "./_components/materials-client";

// Seller product catalog (ROADMAP 3.3): list + completeness + publish + form.
export default async function SellerMaterialsPage() {
  const session = await auth();
  const ctx = session?.user?.id ? await getSellerContext(session.user.id) : null;
  if (!ctx) redirect("/seller");

  const [t, locale, rows, brands] = await Promise.all([
    getTranslations("sellerMat"),
    getLocale(),
    listSellerMaterials(ctx.orgId),
    listBrands(ctx.orgId),
  ]);

  const categories = CATEGORY_META.map((c) => ({
    key: c.key,
    label: categoryLabel(c.key, locale),
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{t("title")}</h1>
          <p className="mt-1 text-sub">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-4">
          {canManageMaterials(ctx.role) && (
            <Link
              href="/seller/materials/import"
              className="rounded-pill border border-brand px-3 py-1.5 text-sm font-medium text-brand transition hover:bg-brand hover:text-white"
            >
              ⬆ {t("importCta")}
            </Link>
          )}
          <Link href="/seller/brands" className="text-sm text-brand hover:underline">
            {t("manageBrands")} →
          </Link>
        </div>
      </header>

      <MaterialsClient
        rows={rows}
        categories={categories}
        brands={brands.map((b) => ({ id: b.id, name: b.name }))}
        canEdit={canManageMaterials(ctx.role)}
      />
    </div>
  );
}
