import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { Workspace } from "@/lib/permissions";
import { getDesignerContext } from "@/lib/projects/service";
import { getSellerContext } from "@/lib/seller/context";
import { getSubscription } from "@/lib/billing/service";
import { GlobalSearch } from "./global-search";
import { NotificationBell } from "./notification-bell";
import { CommandPalette } from "./command-palette";
import { LangToggle } from "./lang-toggle";
import { LogoutButton } from "./logout-button";
import { Logo } from "./logo";
import { SidebarNav, type SideNavItem } from "./sidebar-nav";

// Workspace chrome (design handoff 2B/3G): 240px sidebar — warm-cream for the
// designer side, dark with a SELLER badge for the seller side — plus a slim
// top bar with search / notifications / language / logout. On small screens
// the sidebar folds into a horizontal nav strip.
export async function WorkspaceShell({
  workspace,
  children,
}: {
  workspace: Workspace;
  children: React.ReactNode;
}) {
  const [t, session] = await Promise.all([getTranslations(), auth()]);
  const dark = workspace === "seller";
  const userId = session?.user?.id ?? null;

  // Sidebar extras — all fail-safe decoration.
  let planCard: { plan: string; isFree: boolean } | null = null;
  let sellerFoot: { orgName: string } | null = null;
  let rfqBadge = 0;
  try {
    if (workspace === "designer" && userId) {
      const ctx = await getDesignerContext(userId);
      if (ctx) {
        const sub = await getSubscription(ctx.orgId);
        planCard = { plan: sub.plan.toUpperCase(), isFree: sub.plan === "free" };
      }
    } else if (workspace === "seller" && userId) {
      const ctx = await getSellerContext(userId);
      if (ctx) {
        const [org, open] = await Promise.all([
          prisma.organization.findUnique({ where: { id: ctx.orgId }, select: { name: true } }),
          prisma.rFQRecipient.count({
            where: { sellerOrgId: ctx.orgId, respondedAt: null, rfq: { status: "open" } },
          }),
        ]);
        sellerFoot = { orgName: org?.name ?? "" };
        rfqBadge = open;
      }
    }
  } catch {
    // Sidebar decorations must never take the workspace down.
  }

  const navItems: SideNavItem[] =
    workspace === "designer"
      ? [
          { href: "/designer", icon: "▤", label: t("nav.dashboard") },
          { href: "/designer/projects", icon: "▦", label: t("nav.projects") },
          { href: "/designer/catalog", icon: "◈", label: t("nav.catalog") },
          { href: "/designer/library", icon: "◫", label: t("library.navLabel") },
          { href: "/designer/chat", icon: "◍", label: t("chat.title") },
          { href: "/designer/billing", icon: "◐", label: t("nav.billing") },
        ]
      : [
          { href: "/seller", icon: "▤", label: t("nav.dashboard") },
          { href: "/seller/rfq", icon: "▣", label: t("nav.rfqInbox"), badge: rfqBadge },
          { href: "/seller/materials", icon: "▦", label: t("nav.materials") },
          { href: "/seller/insights", icon: "◉", label: t("nav.insights") },
          { href: "/seller/performance", icon: "◔", label: t("nav.performance") },
          { href: "/seller/team", icon: "◈", label: t("nav.team") },
          { href: "/seller/chat", icon: "◍", label: t("chat.title") },
        ];

  const initials = (session?.user?.name ?? session?.user?.email ?? "?")
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* ── Sidebar (≥lg) ── */}
      <aside
        className={
          dark
            ? "hidden w-[240px] shrink-0 flex-col gap-6 bg-dark px-[18px] py-[26px] lg:flex"
            : "hidden w-[240px] shrink-0 flex-col gap-6 border-r border-line bg-canvas px-[18px] py-[26px] lg:flex"
        }
      >
        <Link href="/" className="flex items-center gap-[9px] px-2">
          <Logo />
          {dark && (
            <span className="rounded-[5px] bg-dark-3 px-[7px] py-[3px] font-mono text-[11.875px] tracking-[.08em] text-dark-text">
              SELLER
            </span>
          )}
        </Link>

        <SidebarNav items={navItems} dark={dark} />

        {/* Bottom slot */}
        {workspace === "designer" && planCard?.isFree && (
          <div className="mt-auto rounded-card bg-dark p-4 text-white">
            <div className="font-mono text-[13.75px] tracking-[.1em] text-brand-bright">
              {t("shell.freePlan")}
            </div>
            <div className="mb-3 mt-2 text-[16.875px] leading-[1.5] text-dark-text">
              {t("shell.upsell")}
            </div>
            <Link
              href="/designer/billing"
              className="block rounded-[9px] bg-brand py-[9px] text-center text-[16.875px] font-semibold text-white hover:bg-brand-deep"
            >
              {t("shell.upgrade")}
            </Link>
          </div>
        )}
        {workspace === "designer" && planCard && !planCard.isFree && (
          <div className="mt-auto px-2">
            <div className="font-mono text-[13.125px] uppercase tracking-[.08em] text-mut">
              {t("shell.plan")}
            </div>
            <div className="mt-1 text-[15.625px] text-sub">{planCard.plan}</div>
          </div>
        )}
        {dark && sellerFoot && (
          <div className="mt-auto px-2">
            <div className="font-mono text-[13.125px] uppercase tracking-[.08em] text-mut">
              {sellerFoot.orgName}
            </div>
            <div className="mt-1 text-[15.625px] text-dark-text">{t("shell.sellerPlan")}</div>
          </div>
        )}
      </aside>

      {/* ── Main column ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line bg-surface px-6 py-3">
          {/* Brand appears here only when the sidebar is hidden */}
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <Logo />
          </Link>
          <div className="order-last w-full flex-none sm:order-none sm:flex sm:w-auto sm:flex-1 sm:justify-center">
            <GlobalSearch
              target={workspace === "designer" ? "/designer/catalog" : "/catalog"}
              className="w-full sm:max-w-sm"
            />
          </div>
          <div className="ml-auto flex items-center gap-3 sm:ml-0">
            <NotificationBell />
            <LangToggle />
            <LogoutButton />
            <span
              aria-hidden
              className="flex h-[34px] w-[34px] items-center justify-center rounded-pill bg-ok-soft text-[16.25px] font-semibold text-ok"
              title={session?.user?.name ?? undefined}
            >
              {initials}
            </span>
          </div>
        </header>

        {/* Mobile nav strip (sidebar folded) */}
        <nav className="flex gap-1 overflow-x-auto border-b border-line bg-surface px-3 py-2 lg:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-pill px-3 py-1.5 text-[16.25px] font-medium text-sub hover:bg-canvas-2 hover:text-ink"
            >
              {item.icon} {item.label}
              {item.badge != null && item.badge > 0 ? ` (${item.badge})` : ""}
            </Link>
          ))}
        </nav>

        <main className="flex-1 p-6">{children}</main>
      </div>
      <CommandPalette workspace={workspace} />
    </div>
  );
}
