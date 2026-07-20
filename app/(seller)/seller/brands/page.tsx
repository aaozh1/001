import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { canManageMaterials, getSellerContext } from "@/lib/seller/context";
import { listBrands } from "@/lib/seller/brand-service";
import { BrandsClient } from "./_components/brands-client";

export default async function SellerBrandsPage() {
  const session = await auth();
  const ctx = session?.user?.id ? await getSellerContext(session.user.id) : null;
  if (!ctx) redirect("/seller");

  const [t, rows] = await Promise.all([
    getTranslations("sellerBrand"),
    listBrands(ctx.orgId),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/seller/materials" className="text-sm text-sub hover:text-ink">
        {t("back")}
      </Link>
      <header className="mt-2 mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-1 text-sub">{t("subtitle")}</p>
      </header>

      <BrandsClient rows={rows} canEdit={canManageMaterials(ctx.role)} />
    </div>
  );
}
