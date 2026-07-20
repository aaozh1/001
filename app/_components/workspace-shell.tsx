import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Workspace } from "@/lib/permissions";
import { LangToggle } from "./lang-toggle";
import { LogoutButton } from "./logout-button";

// Shared chrome for the designer + seller workspaces: brand, workspace label,
// language toggle and logout. Keeps the two sides visually consistent while
// their contents diverge in later phases.
export async function WorkspaceShell({
  workspace,
  children,
}: {
  workspace: Workspace;
  children: React.ReactNode;
}) {
  const t = await getTranslations();
  const label =
    workspace === "designer" ? t("designer.workspace") : t("seller.center");

  // Persistent workspace navigation — every core area is one click away from
  // anywhere, so no feature is reachable only by typing a URL.
  const navItems =
    workspace === "designer"
      ? [
          { href: "/designer", label: t("nav.dashboard") },
          { href: "/designer/projects", label: t("nav.projects") },
          { href: "/designer/catalog", label: t("nav.catalog") },
          { href: "/designer/library", label: t("library.navLabel") },
          { href: "/designer/chat", label: `💬 ${t("chat.title")}` },
        ]
      : [
          { href: "/seller", label: t("nav.dashboard") },
          { href: "/seller/rfq", label: t("nav.rfqInbox") },
          { href: "/seller/materials", label: t("nav.materials") },
          { href: "/seller/performance", label: t("nav.performance") },
          { href: "/seller/team", label: t("nav.team") },
          { href: "/seller/chat", label: `💬 ${t("chat.title")}` },
        ];

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line bg-surface px-6 py-3">
        <div className="flex items-baseline gap-3">
          <Link href="/" className="text-[21px] font-bold tracking-tight text-brand">
            {t("common.appName")}
          </Link>
          <span className="text-sm text-sub">{label}</span>
        </div>
        <nav className="flex flex-wrap items-center gap-4">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm text-sub hover:text-ink">
              {item.label}
            </Link>
          ))}
          <LangToggle />
          <LogoutButton />
        </nav>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
