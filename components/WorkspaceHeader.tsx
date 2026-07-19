import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { LogoutButton } from "@/components/LogoutButton";

// Shared top bar for both workspaces (sidebar + full workspace UI lands in
// Phase 3; this is the minimal authenticated shell for Phase 0).
export async function WorkspaceHeader({
  title,
  userName,
}: {
  title: string;
  userName?: string | null;
}) {
  const [common, nav] = await Promise.all([
    getTranslations("common"),
    getTranslations("nav"),
  ]);

  return (
    <header className="flex items-center justify-between border-b border-sand bg-white px-6 py-3">
      <div className="flex items-baseline gap-3">
        <Link href="/" className="text-lg font-bold text-earth">
          {common("appName")}
        </Link>
        <span className="text-sm text-muted">{title}</span>
      </div>
      <div className="flex items-center gap-3">
        {userName && <span className="text-sm text-ink/70">{userName}</span>}
        <LocaleSwitcher />
        <LogoutButton label={nav("logout")} />
      </div>
    </header>
  );
}
