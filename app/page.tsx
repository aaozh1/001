import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { LangToggle } from "./_components/lang-toggle";
import { GlobalSearch } from "./_components/global-search";
import { Badge, buttonClasses } from "@/components/ui";
import { CATEGORY_META, categoryIcon, categoryLabel } from "@/lib/materials/categories";

export default async function Home() {
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4">
        <span className="text-[22px] font-bold tracking-tight text-brand">
          {t("common.appName")}
        </span>
        <div className="order-last w-full flex-none sm:order-none sm:flex sm:w-auto sm:flex-1 sm:justify-center">
          <GlobalSearch target="/catalog" className="w-full sm:max-w-md" />
        </div>
        <div className="ml-auto flex items-center gap-3 sm:ml-0">
          <LangToggle />
          <Link
            href="/login"
            className="text-sm font-medium text-sub hover:text-ink"
          >
            {t("common.login")}
          </Link>
          <Link href="/register" className={buttonClasses({ size: "sm" })}>
            {t("common.register")}
          </Link>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <Badge variant="brand">{t("home.badge")}</Badge>
        <h1 className="text-4xl font-bold tracking-tight text-ink">
          {t("common.appName")}
        </h1>
        <p className="max-w-md text-lg font-medium text-ink">
          {t("common.tagline")}
        </p>
        <p className="max-w-xl text-sub">{t("home.heroSub")}</p>
        <p className="max-w-xl text-xs text-mut">{t("home.audience")}</p>

        {/* The open front door: browse products with no account (ความ public
            ของแพลตฟอร์ม) — one big button + search + a chip per family. */}
        <div className="mt-2">
          <Link href="/catalog" className={buttonClasses({ size: "md" })}>
            🧱 {t("home.browseAll")}
          </Link>
        </div>
        <div className="w-full max-w-md">
          <GlobalSearch target="/catalog" />
        </div>
        <div className="max-w-2xl">
          <p className="mb-2 text-xs text-mut">{t("home.browseByCat")}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {CATEGORY_META.map((c) => (
              <Link
                key={c.key}
                href={`/catalog?category=${encodeURIComponent(c.key)}`}
                className="rounded-pill border border-line-2 bg-surface px-3 py-1.5 text-[13px] text-sub transition hover:-translate-y-0.5 hover:border-brand hover:text-brand"
              >
                {categoryIcon(c.key)} {categoryLabel(c.key, locale)}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 border-t border-line pt-5">
          <Link href="/designer" className={buttonClasses({ variant: "ghost" })}>
            {t("home.goDesigner")}
          </Link>
          <Link href="/seller" className={buttonClasses({ variant: "ghost" })}>
            {t("home.goSeller")}
          </Link>
        </div>
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
