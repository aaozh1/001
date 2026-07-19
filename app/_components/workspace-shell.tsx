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

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="flex items-center justify-between border-b border-sand bg-surface px-6 py-3">
        <div className="flex items-baseline gap-3">
          <Link href="/" className="font-bold tracking-tight text-earth">
            {t("common.appName")}
          </Link>
          <span className="text-sm text-muted">{label}</span>
        </div>
        <div className="flex items-center gap-3">
          <LangToggle />
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
