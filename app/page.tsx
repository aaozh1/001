import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LangToggle } from "./_components/lang-toggle";

export default async function Home() {
  const t = await getTranslations();

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="font-bold tracking-tight text-earth">
          {t("common.appName")}
        </span>
        <div className="flex items-center gap-3">
          <LangToggle />
          <Link
            href="/login"
            className="text-sm font-medium text-muted hover:text-ink"
          >
            {t("common.login")}
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-soft"
          >
            {t("common.register")}
          </Link>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <span className="rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-brand">
          {t("home.badge")}
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-earth">
          {t("common.appName")}
        </h1>
        <p className="max-w-md text-lg font-medium text-ink">
          {t("common.tagline")}
        </p>
        <p className="max-w-md text-muted">{t("home.heroSub")}</p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/designer"
            className="rounded-card bg-brand px-5 py-2.5 font-medium text-white shadow-soft hover:bg-brand-soft"
          >
            {t("home.goDesigner")}
          </Link>
          <Link
            href="/seller"
            className="rounded-card border border-sand bg-surface px-5 py-2.5 font-medium text-ink hover:border-brand"
          >
            {t("home.goSeller")}
          </Link>
        </div>
      </div>
    </main>
  );
}
