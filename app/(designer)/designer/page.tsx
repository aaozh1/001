import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Badge, Card, buttonClasses } from "@/components/ui";
import { getDesignerContext } from "@/lib/projects/service";
import { getDesignerDashboard, getOnboardingChecklist } from "@/lib/dashboard/service";
import { getSubscription } from "@/lib/billing/service";
import { DESIGNER_PLANS } from "@/lib/billing/plans";

export default async function DesignerDashboard() {
  const session = await auth();
  const ctx = session?.user?.id ? await getDesignerContext(session.user.id) : null;
  if (!ctx) redirect("/login?callbackUrl=/designer");

  const [t, summary, sub, checklist] = await Promise.all([
    getTranslations("dashboard"),
    getDesignerDashboard(ctx.orgId),
    getSubscription(ctx.orgId),
    getOnboardingChecklist(ctx.orgId),
  ]);
  const name = session?.user?.name ?? session?.user?.email ?? "";
  const plan = DESIGNER_PLANS[sub.plan];

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

      {/* First-run: no projects yet → point at the three ways to start, instead
          of showing a wall of zeros. */}
      {summary.activeProjects === 0 && (
        <Card className="mt-5 gap-3 border-brand/30 bg-brand-soft p-6">
          <h2 className="font-semibold text-ink">{t("startTitle")}</h2>
          <p className="text-sm text-sub">{t("startHint")}</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/designer/projects" className={buttonClasses({ size: "sm" })}>
              {t("startCreate")}
            </Link>
            <Link
              href="/designer/projects/import"
              className={buttonClasses({ size: "sm", variant: "ghost" })}
            >
              {t("startImport")}
            </Link>
            <Link
              href="/designer/catalog"
              className={buttonClasses({ size: "sm", variant: "ghost" })}
            >
              {t("startBrowse")}
            </Link>
          </div>
        </Card>
      )}

      {/* Onboarding checklist — สามก้าวแรก; หายเองเมื่อครบ */}
      {!checklist.done && summary.activeProjects > 0 && (
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

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {/* Attention list */}
        <Card className="gap-3">
          <h2 className="font-semibold text-ink">{t("attention")}</h2>
          {summary.attention.length === 0 ? (
            <p className="text-sm text-sub">{t("allClear")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {summary.attention.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/designer/projects/${p.id}`}
                    className="flex items-center justify-between gap-3 rounded-card border border-line px-4 py-3 transition hover:shadow-lifted"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-soft text-[17px] text-brand-deep">
                        ▦
                      </span>
                      <span className="truncate text-[14.5px] font-semibold text-ink">{p.name}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      {p.quotesToReview > 0 && (
                        <span className="block text-[13px] font-semibold text-ok">
                          {p.quotesToReview} {t("quotesTag")}
                        </span>
                      )}
                      {p.optionsPending > 0 && (
                        <span className="block text-[12px] text-brand-deep">
                          {p.optionsPending} {t("optionsTag")}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* VE savings + plan */}
        <div className="flex flex-col gap-4">
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
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/designer/projects" className={buttonClasses({ size: "sm" })}>
          {t("goProjects")}
        </Link>
        <Link
          href="/designer/catalog"
          className={buttonClasses({ size: "sm", variant: "ghost" })}
        >
          {t("goCatalog")}
        </Link>
      </div>
    </div>
  );
}
