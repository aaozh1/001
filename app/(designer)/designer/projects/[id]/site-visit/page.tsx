import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { canManageProjects } from "@/lib/permissions";
import { getDesignerContext } from "@/lib/projects/service";
import { getSiteVisit, listProjectIssues } from "@/lib/site-visit/service";
import { SiteVisitClient } from "./_components/site-visit-client";

type Props = { params: Promise<{ id: string }> };

// 5J site-visit companion — the schedule as a phone-first checklist: mark
// installed, pin site photos to line items, log issues. Everything syncs back
// to the project. Hit targets ≥44px.
export default async function SiteVisitPage({ params }: Props) {
  const session = await auth();
  const ctx = session?.user?.id ? await getDesignerContext(session.user.id) : null;
  if (!ctx) redirect("/designer");

  const { id } = await params;
  const [view, issues, t, locale] = await Promise.all([
    getSiteVisit(ctx.orgId, id),
    listProjectIssues(ctx.orgId, id),
    getTranslations("siteVisit"),
    getLocale(),
  ]);
  if (!view) notFound();

  const dateLabel = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date());

  return (
    <div className="mx-auto max-w-md pb-20">
      <Link
        href={`/designer/projects/${view.projectId}`}
        className="text-sm text-sub hover:text-ink"
      >
        ← {t("back")}
      </Link>

      <header className="mt-3">
        <h1 className="text-xl font-bold tracking-tight text-ink">
          {t("title", { project: view.projectName })}
        </h1>
        <p className="mt-0.5 font-mono text-[11px] text-mut">
          {dateLabel} · {t("itemCount", { n: view.items.length })}
        </p>
      </header>

      <SiteVisitClient
        projectId={view.projectId}
        items={view.items}
        projectIssues={issues}
        canManage={canManageProjects(ctx.role)}
      />

      {/* Bottom tab bar — Checklist (here) / Board / Chat, 44px+ targets */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface">
        <div className="mx-auto flex max-w-md">
          <span className="flex min-h-11 flex-1 items-center justify-center text-[12px] font-bold text-brand">
            {t("tabChecklist")}
          </span>
          <Link
            href={`/designer/projects/${view.projectId}`}
            className="flex min-h-11 flex-1 items-center justify-center text-[12px] text-mut hover:text-ink"
          >
            {t("tabBoard")}
          </Link>
          <Link
            href="/designer/chat"
            className="flex min-h-11 flex-1 items-center justify-center text-[12px] text-mut hover:text-ink"
          >
            {t("tabChat")}
          </Link>
        </div>
      </nav>
    </div>
  );
}
