import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { LogoutButton } from "@/components/LogoutButton";
import { hasSide } from "@/lib/permissions/access";

export default async function Home() {
  const session = await auth();
  const [common, nav, landing] = await Promise.all([
    getTranslations("common"),
    getTranslations("nav"),
    getTranslations("landing"),
  ]);
  const memberships = session?.user?.memberships ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between p-4">
        <span className="text-lg font-bold text-earth">{common("appName")}</span>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          {session?.user ? (
            <LogoutButton label={nav("logout")} />
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-3 py-1 text-sm text-ink/70 hover:bg-brand/10"
              >
                {nav("login")}
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-brand px-3 py-1 text-sm font-medium text-white"
              >
                {nav("register")}
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
        <span className="rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-brand">
          {common("tagline")}
        </span>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-earth">
          {landing("heroTitle")}
        </h1>
        <p className="max-w-md text-muted">{landing("heroSubtitle")}</p>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          {session?.user ? (
            <>
              {hasSide(memberships, "designer") && (
                <Link
                  href="/designer"
                  className="rounded-lg bg-brand px-4 py-2 font-medium text-white"
                >
                  {nav("designerWorkspace")}
                </Link>
              )}
              {hasSide(memberships, "seller") && (
                <Link
                  href="/seller"
                  className="rounded-lg bg-earth px-4 py-2 font-medium text-white"
                >
                  {nav("sellerCenter")}
                </Link>
              )}
            </>
          ) : (
            <>
              <Link
                href="/register"
                className="rounded-lg bg-brand px-4 py-2 font-medium text-white"
              >
                {landing("forDesigners")}
              </Link>
              <Link
                href="/register"
                className="rounded-lg border border-sand px-4 py-2 font-medium text-ink/80 hover:bg-brand/10"
              >
                {landing("forSellers")}
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
