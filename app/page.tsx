import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LangToggle } from "./_components/lang-toggle";
import { Badge, buttonClasses } from "@/components/ui";

export default async function Home() {
  const t = await getTranslations();

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-[21px] font-bold tracking-tight text-brand">
          {t("common.appName")}
        </span>
        <div className="flex items-center gap-3">
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
        <p className="max-w-md text-sub">{t("home.heroSub")}</p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Link href="/designer" className={buttonClasses()}>
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
