import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { LangToggle } from "./_components/lang-toggle";
import { GlobalSearch } from "./_components/global-search";
import { Badge, buttonClasses } from "@/components/ui";
import { CATEGORY_META, categoryIcon, categoryLabel } from "@/lib/materials/categories";

// Homepage — two doors side by side (ตาม comment): LEFT = the open public
// catalog (เห็นสินค้าได้ทันที ไม่ต้องสมัคร), RIGHT = the workspaces for both
// user sides. Stacks vertically on phones.
export default async function Home() {
  const [t, locale, session] = await Promise.all([
    getTranslations(),
    getLocale(),
    auth(),
  ]);
  // Stats are decoration — the front door must render even if the DB hiccups.
  let stats: { materials: number; brands: number } | null = null;
  try {
    const [materials, brands] = await Promise.all([
      prisma.material.count({ where: { status: "published" } }),
      prisma.brand.count(),
    ]);
    stats = { materials, brands };
  } catch {
    stats = null;
  }
  const loggedIn = !!session?.user;

  return (
    <main className="flex min-h-screen flex-col bg-canvas">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 bg-surface px-6 py-4">
        <span className="text-[22px] font-bold tracking-tight text-brand">
          {t("common.appName")}
        </span>
        <div className="order-last w-full flex-none sm:order-none sm:flex sm:w-auto sm:flex-1 sm:justify-center">
          <GlobalSearch target="/catalog" className="w-full sm:max-w-md" />
        </div>
        <div className="ml-auto flex items-center gap-3 sm:ml-0">
          <LangToggle />
          {loggedIn ? (
            <Link href="/designer" className={buttonClasses({ size: "sm" })}>
              {t("common.myWorkspace")}
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-sub hover:text-ink">
                {t("common.login")}
              </Link>
              <Link href="/register" className={buttonClasses({ size: "sm" })}>
                {t("common.register")}
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Compact hero */}
      <div className="flex flex-col items-center gap-3 px-6 pb-2 pt-10 text-center">
        <Badge variant="brand">{t("home.badge")}</Badge>
        <h1 className="text-4xl font-bold tracking-tight text-ink">
          {t("common.appName")}
        </h1>
        <p className="max-w-md text-lg font-medium text-ink">{t("common.tagline")}</p>
        <p className="max-w-2xl text-sub">{t("home.heroSub")}</p>
        <p className="max-w-2xl text-xs text-mut">{t("home.audience")}</p>
      </div>

      {/* Two doors */}
      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-5 px-6 py-8 lg:grid-cols-2">
        {/* ── LEFT: the open catalog ── */}
        <section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6 shadow-soft transition hover:shadow-lifted">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-2xl">🧱</span>
              <h2 className="text-xl font-bold tracking-tight text-ink">
                {t("home.catalogTitle")}
              </h2>
              <Badge variant="ok">{t("home.catalogOpen")}</Badge>
            </div>
            <p className="mt-1.5 text-sm text-sub">{t("home.catalogDesc")}</p>
            {stats && (
              <p className="mt-1 text-xs text-mut">
                {t("home.catalogStats", {
                  materials: stats.materials.toLocaleString(),
                  brands: stats.brands.toLocaleString(),
                })}
              </p>
            )}
          </div>

          <GlobalSearch target="/catalog" />

          <div>
            <Link href="/catalog" className={buttonClasses({ size: "md" })}>
              🧱 {t("home.browseAll")}
            </Link>
          </div>

          <div>
            <p className="mb-2 text-xs text-mut">{t("home.browseByCat")}</p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_META.map((c) => (
                <Link
                  key={c.key}
                  href={`/catalog?category=${encodeURIComponent(c.key)}`}
                  className="rounded-pill border border-line-2 bg-canvas px-2.5 py-1 text-[13px] text-sub transition hover:-translate-y-0.5 hover:border-brand hover:text-brand"
                >
                  {categoryIcon(c.key)} {categoryLabel(c.key, locale)}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── RIGHT: the workspaces ── */}
        <section className="flex flex-col gap-4">
          {/* Designer */}
          <div className="flex flex-1 flex-col gap-3 rounded-card border border-line bg-surface p-6 shadow-soft transition hover:shadow-lifted">
            <div className="flex items-center gap-2">
              <span className="text-2xl">✏️</span>
              <h2 className="text-lg font-bold tracking-tight text-ink">
                {t("home.designerTitle")}
              </h2>
            </div>
            <p className="text-sm text-sub">{t("home.designerDesc")}</p>
            <ul className="flex flex-col gap-1 text-sm text-ink">
              <li>📋 {t("home.designerF1")}</li>
              <li>📨 {t("home.designerF2")}</li>
              <li>📕 {t("home.designerF3")}</li>
              <li>💡 {t("home.designerF4")}</li>
            </ul>
            <div className="mt-auto flex flex-wrap gap-2 pt-1">
              <Link href="/designer" className={buttonClasses({ size: "sm" })}>
                {t("home.goDesigner")}
              </Link>
              {!loggedIn && (
                <Link
                  href="/register"
                  className={buttonClasses({ size: "sm", variant: "ghost" })}
                >
                  {t("home.registerFree")}
                </Link>
              )}
            </div>
          </div>

          {/* Seller */}
          <div className="flex flex-1 flex-col gap-3 rounded-card border border-line bg-surface p-6 shadow-soft transition hover:shadow-lifted">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏪</span>
              <h2 className="text-lg font-bold tracking-tight text-ink">
                {t("home.sellerTitle")}
              </h2>
            </div>
            <p className="text-sm text-sub">{t("home.sellerDesc")}</p>
            <ul className="flex flex-col gap-1 text-sm text-ink">
              <li>📥 {t("home.sellerF1")}</li>
              <li>⬆ {t("home.sellerF2")}</li>
              <li>⚖️ {t("home.sellerF3")}</li>
            </ul>
            <div className="mt-auto flex flex-wrap gap-2 pt-1">
              <Link href="/seller" className={buttonClasses({ size: "sm", variant: "ghost" })}>
                {t("home.goSeller")}
              </Link>
            </div>
          </div>
        </section>
      </div>

      <footer className="flex items-center justify-center gap-4 border-t border-line bg-surface px-6 py-3 text-xs text-mut">
        <Link href="/legal/terms" className="hover:text-ink">
          {t("legal.termsLink")}
        </Link>
        <span>·</span>
        <Link href="/legal/privacy" className="hover:text-ink">
          {t("legal.privacyLink")}
        </Link>
      </footer>
    </main>
  );
}
