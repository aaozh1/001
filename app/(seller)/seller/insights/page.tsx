import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { getSellerContext } from "@/lib/seller/context";
import { getSellerInsights } from "@/lib/seller/insights-service";
import { categoryLabel } from "@/lib/materials/categories";

// 5I Demand insights — aggregate search & spec trends for the seller.
// IRON RULE #3: aggregate only, never individual designer/office/project data.
export default async function SellerInsightsPage() {
  const session = await auth();
  const ctx = session?.user?.id ? await getSellerContext(session.user.id) : null;
  if (!ctx) redirect("/seller");

  const [t, locale, data] = await Promise.all([
    getTranslations("insights"),
    getLocale(),
    getSellerInsights(ctx.orgId),
  ]);

  const monthLabel = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date());
  const scopeLabel =
    data.categories.length > 0
      ? data.categories.map((c) => categoryLabel(c, locale)).join(" · ")
      : t("noCategories");

  const filterLabel = (key: string) => {
    switch (key) {
      case "q":
        return t("filter.q");
      case "brand":
        return t("filter.brand");
      case "priceMin":
      case "priceMax":
        return t("filter.price");
      case "cert":
        return t("filter.cert");
      case "verified":
        return t("filter.verified");
      default:
        return key;
    }
  };

  const stat = (value: string, label: string) => (
    <div className="rounded-card border border-line bg-surface p-5">
      <div className="font-mono text-[32.5px] font-semibold text-brand-deep">{value}</div>
      <div className="mt-1 text-sm text-mut">{label}</div>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{t("title")}</h1>
          <p className="mt-1 text-sub">{t("subtitle")}</p>
        </div>
        <span className="font-mono text-xs text-mut">
          {monthLabel} · {scopeLabel}
        </span>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {stat(
          data.trendPct != null
            ? `${data.trendPct >= 0 ? "+" : "−"}${Math.abs(data.trendPct)}%`
            : "—",
          data.trendPct != null ? t("statSearches") : t("statSearchesNew"),
        )}
        {stat(String(data.rfqTotal), t("statRfqs", { quoted: data.rfqQuoted }))}
        {stat(
          data.topFilter ? filterLabel(data.topFilter.key) : "—",
          t("statTopFilter"),
        )}
      </div>

      <section className="mt-4 rounded-card border border-line bg-surface p-6">
        <h2 className="mb-4 text-sm font-bold text-ink">{t("barsTitle")}</h2>
        {data.bars.length === 0 ? (
          <p className="text-sm text-mut">{t("noData")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {data.bars.map((b) => (
              <div key={b.key} className="flex items-center gap-3.5">
                <span className="w-44 shrink-0 text-sm text-ink-2">{filterLabel(b.key)}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-pill bg-canvas-2">
                  <div
                    className="h-full rounded-pill bg-brand"
                    style={{ width: `${b.sharePct}%` }}
                  />
                </div>
                <span className="w-11 shrink-0 text-right font-mono text-xs text-mut">
                  {b.sharePct}%
                </span>
              </div>
            ))}
          </div>
        )}

        {data.gap && (
          <div className="mt-5 flex items-center gap-2.5 rounded-sm border border-brand-line bg-brand-soft px-4 py-3">
            <span aria-hidden>💡</span>
            <span className="text-[15.625px] text-sub">
              {t("gapNudge", {
                name: data.gap.name,
                filter: filterLabel(data.gap.filterKey),
                pct: data.gap.sharePct,
              })}{" "}
              <Link href="/seller/materials" className="font-semibold text-brand hover:underline">
                {t("gapCta")} →
              </Link>
            </span>
          </div>
        )}
      </section>

      <p className="mt-3 font-mono text-[14.375px] text-mut">🔒 {t("aggregateNote")}</p>
    </div>
  );
}
