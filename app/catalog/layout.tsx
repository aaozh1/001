import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { buttonClasses } from "@/components/ui";
import { GlobalSearch } from "@/app/_components/global-search";
import { LangToggle } from "@/app/_components/lang-toggle";

// PUBLIC catalog chrome — no login required (the catalog is the platform's
// open front door). Logged-in users get a link back to their workspace.
export default async function PublicCatalogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [t, session] = await Promise.all([getTranslations(), auth()]);
  const loggedIn = !!session?.user;

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line bg-surface px-6 py-3">
        <Link href="/" className="text-[22px] font-bold tracking-tight text-brand">
          {t("common.appName")}
        </Link>
        <div className="order-last w-full flex-none sm:order-none sm:flex sm:w-auto sm:flex-1 sm:justify-center">
          <GlobalSearch target="/catalog" className="w-full sm:max-w-md" />
        </div>
        <div className="ml-auto flex items-center gap-3 sm:ml-0">
          <LangToggle />
          {loggedIn ? (
            <Link href="/designer" className={buttonClasses({ size: "sm", variant: "ghost" })}>
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
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
