import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { canManageMaterials, getSellerContext } from "@/lib/seller/context";
import { CATEGORY_META, categoryLabel } from "@/lib/materials/categories";
import { ImportWizard } from "./_components/import-wizard";

// Bulk product import — upload a catalog / material sheet (.xlsx/.csv/.pdf)
// or paste text; the system proposes rows, the seller reviews, everything
// lands as DRAFTS.
export default async function SellerImportPage() {
  const session = await auth();
  const ctx = session?.user?.id ? await getSellerContext(session.user.id) : null;
  if (!ctx) redirect("/seller");
  if (!canManageMaterials(ctx.role)) redirect("/seller/materials");

  const [t, locale] = await Promise.all([getTranslations("sellerImport"), getLocale()]);
  const categories = CATEGORY_META.map((c) => ({
    key: c.key,
    label: categoryLabel(c.key, locale),
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/seller/materials" className="text-sm text-sub hover:text-ink">
        ← {t("back")}
      </Link>
      <header className="mb-5 mt-3">
        <h1 className="text-2xl font-bold tracking-tight text-ink">⬆ {t("title")}</h1>
        <p className="mt-1 text-sub">{t("subtitle")}</p>
      </header>
      <ImportWizard categories={categories} />
    </div>
  );
}
