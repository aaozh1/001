import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { canManageMaterials, getSellerContext } from "@/lib/seller/context";
import { listSellerMaterials } from "@/lib/materials/seller-service";
import { CATEGORY_META, categoryLabel } from "@/lib/materials/categories";
import { MaterialsClient } from "./_components/materials-client";

// Seller product catalog (ROADMAP 3.3): list + completeness + publish + form.
export default async function SellerMaterialsPage() {
  const session = await auth();
  const ctx = session?.user?.id ? await getSellerContext(session.user.id) : null;
  if (!ctx) redirect("/seller");

  const [t, locale, rows] = await Promise.all([
    getTranslations("sellerMat"),
    getLocale(),
    listSellerMaterials(ctx.orgId),
  ]);

  const categories = CATEGORY_META.map((c) => ({
    key: c.key,
    label: categoryLabel(c.key, locale),
  }));

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-1 text-sub">{t("subtitle")}</p>
      </header>

      <MaterialsClient
        rows={rows}
        categories={categories}
        canEdit={canManageMaterials(ctx.role)}
      />
    </div>
  );
}
