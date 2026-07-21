import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Badge, Card, buttonClasses } from "@/components/ui";
import { getDesignerContext } from "@/lib/projects/service";
import {
  getDesignerDashboard,
  getOnboardingChecklist,
  getQuoteActivity,
} from "@/lib/dashboard/service";
import { getSubscription } from "@/lib/billing/service";
import { DESIGNER_PLANS } from "@/lib/billing/plans";

export default async function DesignerDashboard() {
  const session = await auth();
  const ctx = session?.user?.id ? await getDesignerContext(session.user.id) : null;
  if (!ctx) redirect("/login?callbackUrl=/designer");

  const [t, locale, summary, sub, checklist, activity] = await Promise.all([
    getTranslations("dashboard"),
    getLocale(),
    getDesignerDashboard(ctx.orgId),
    getSubscription(ctx.orgId),
    getOnboardingChecklist(ctx.orgId),
    getQuoteActivity(ctx.orgId),
  ]);
  const name = session?.user?.name ?? session?.user?.email ?? "";
  const plan = DESIGNER_PLANS[sub.plan];
  const dateFmt = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    day: "numeric",
    month: "short",
  });
  // 5A: brand-new org — nothing beyond the starter project, no RFQ/Spec Book.
  const fresh =
    summary.projectRows.length <= 1 && !checklist.hasRfq && !checklist.hasSpecBook;
  const starter = summary.projectRows[0] ?? null;

  const metric = (label: string, value: number | string, href?: string, accent?: boolean) => {
    const inner = (
      <Card className={`gap-1 ${href ? "transition hover:shadow-lifted" : ""}`} padded>
        <span className="font-mono text-[26px] font-semibold text-brand-deep">{value}</span>
        <span className={`text-[12.5px] ${accent ? "text-brand" : "text-mut"}`}>{label}</span>
      </Card>
    );
    return href ? (
      <Link key={label} href={href}>
        {inner}
      </Link>
    ) : (
      <div key={label}>{inner}</div>
    );
  };

  const step = (done: boolean, label: string, href: string) => (
    <Link
      key={label}
      href={href}
      className={`flex items-center gap-2 rounded-pill border px-3 py-1.5 text-sm transition ${
        done
          ? "border-ok bg-ok-soft text-ok"
          : "border-line-2 bg-surface text-ink hover:border-brand"
      }`}
    >
      <span>{done ? "✅" : "⬜"}</span>
      {label}
    </Link>
  );

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold tracking-[-.01em] text-ink">
            {t("welcome", { name })}
          </h1>
          <p className="mt-0.5 text-[13px] text-mut">{t("subtitle")}</p>
        </div>
        <Link
          href="/designer/projects"
          className="inline-flex rounded-sm bg-brand px-[18px] py-2.5 text-[14px] font-semibold text-white transition hover:bg-brand-deep"
        >
          ＋ {t("goProjects")}
        </Link>
      </div>

      {/* 5A first-run: centered welcome instead of a wall of zeros. Fresh =
          nothing beyond the starter project and no RFQ/Spec Book yet. */}
      {fresh && (
        <div className="mx-auto flex max-w-lg flex-col items-center py-14 text-center">
          <div className="flex gap-3">
            {["#c9c2b4", "#b0512f", "#9db4bd", "#a9743f"].map((c) => (
              <span
                key={c}
                className="h-12 w-12 rounded-[12px]"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <h2 className="mt-6 text-[26px] font-bold tracking-tight text-ink">
            {t("welcomeNewTitle")}
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-sub">{t("welcomeNewBody")}</p>
          <div className="mt-5 flex gap-2.5">
            <Link href="/designer/projects" className={buttonClasses({})}>
              ＋ {t("startCreate")}
            </Link>
            <Link href="/designer/projects/import" className={buttonClasses({ variant: "ghost" })}>
              {t("startImport")}
            </Link>
          </div>
          {starter && (
            <Link
              href={`/designer/projects/${starter.id}`}
              className="mt-6 flex w-full items-center gap-3 rounded-card border border-dashed border-line-3 bg-surface px-5 py-4 text-left transition hover:border-brand"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-brand-soft text-brand">
                ▦
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-ink">
                  {t("sampleTitle", { name: starter.name })}
                </span>
                <span className="block text-xs text-mut">{t("sampleHint")}</span>
              </span>
              <span className="text-brand">→</span>
            </Link>
          )}
          <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-1 font-mono text-xs text-mut">
            {[t("onboardOption"), t("onboardRfq"), t("onboardBook")].map((s, i) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-canvas-2 text-[9px] font-bold">
                  {i + 1}
                </span>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Onboarding checklist — สามก้าวแรก; หายเองเมื่อครบ */}
      {!fresh && !checklist.done && summary.activeProjects > 0 && (
        <Card className="mt-5 gap-3 p-5">
          <h2 className="font-semibold text-ink">🚀 {t("onboardTitle")}</h2>
          <div className="flex flex-wrap gap-2">
            {step(checklist.hasOption, t("onboardOption"), "/designer/projects")}
            {step(checklist.hasRfq, t("onboardRfq"), "/designer/projects")}
            {step(checklist.hasSpecBook, t("onboardBook"), "/designer/projects")}
          </div>
          <p className="text-xs text-mut">{t("onboardHint")}</p>
        </Card>
      )}

      {/* Pending-work buckets — "what needs me right now". */}
      {!fresh && (
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metric(t("activeProjects"), summary.activeProjects, "/designer/projects")}
        {metric(t("optionsPending"), summary.optionsPending, "/designer/projects")}
        {metric(
          t("quotesToReview"),
          summary.quotesToReview,
          "/designer/projects",
          summary.quotesToReview > 0,
        )}
        {metric(t("awaitingQuotes"), summary.awaitingQuotes)}
      </div>
      )}

      {/* 2B: Active projects — full rows with specified/pending counts */}
      {!fresh && summary.projectRows.length > 0 && (
        <section className="mt-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[16px] font-bold text-ink">{t("activeTitle")}</h2>
            <Link href="/designer/projects" className="text-sm font-semibold text-brand hover:underline">
              {t("viewAll")} →
            </Link>
          </div>
          <ul className="mt-3 flex flex-col gap-2.5">
            {summary.projectRows.slice(0, 4).map((p) => (
              <li key={p.id}>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3 shadow-soft">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-brand-soft text-[17px] text-brand-deep">
                      ▦
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-bold text-ink">{p.name}</span>
                      <span className="block font-mono text-xs text-mut">
                        {t("rowMeta", { items: p.lineItems, date: dateFmt.format(p.updatedAt) })}
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center gap-4">
                    <span className="text-right">
                      <span className="block text-[13px] font-semibold text-ok">
                        {t("rowConfirmed", { n: p.confirmed })}
                      </span>
                      {p.optionsPending > 0 && (
                        <span className="block text-xs text-brand-deep">
                          {t("rowPending", { n: p.optionsPending })}
                        </span>
                      )}
                    </span>
                    <Link
                      href={`/designer/projects/${p.id}`}
                      className={buttonClasses({ size: "sm", variant: "ghost" })}
                    >
                      {t("openSchedule")}
                    </Link>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 2B: Recent quote activity feed */}
      {!fresh && activity.length > 0 && (
        <section className="mt-6">
          <h2 className="text-[16px] font-bold text-ink">{t("activityTitle")}</h2>
          <div className="mt-3 overflow-hidden rounded-card border border-line bg-surface shadow-soft">
            {activity.map((a, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-0"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-line bg-canvas font-mono text-[10px] font-semibold text-sub">
                    {a.sellerName.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-ink">
                      {t("activityLine", { seller: a.sellerName, code: a.code })}
                    </span>
                    <span className="block font-mono text-xs text-mut">
                      {a.projectName} · {dateFmt.format(a.at)}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-[13px] font-semibold text-brand-deep">
                    {a.priceLabel}
                  </span>
                  {a.status === "selected" && (
                    <span className="font-mono text-[11px] font-semibold text-ok">
                      ✓ {t("activityWon")}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {!fresh && (
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card className="gap-1">
          <h2 className="font-semibold text-ink">{t("veTitle")}</h2>
          <p className="text-2xl font-bold tracking-tight text-ok">
            ฿{summary.veSavingsThb.toLocaleString()}
          </p>
          <p className="text-xs text-mut">{t("veCaption", { swaps: summary.veSwaps })}</p>
        </Card>

        <Card className="gap-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">{t("planTitle")}</h2>
            <Badge variant={sub.plan === "free" ? "neutral" : "brand"}>
              {t(`plan.${sub.plan}`)}
            </Badge>
          </div>
          <p className="text-xs text-mut">
            {plan.priceThb === 0 ? t("planFree") : t("planPrice", { price: plan.priceThb })}
          </p>
          <Link
            href="/designer/billing"
            className={buttonClasses({ size: "sm", variant: "ghost" })}
          >
            {t("managePlan")}
          </Link>
        </Card>
      </div>
      )}
    </div>
  );
}
