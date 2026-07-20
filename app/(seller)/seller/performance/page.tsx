import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Card } from "@/components/ui";
import { getSellerContext } from "@/lib/seller/context";
import { getPerformanceReport } from "@/lib/seller/performance-service";

// Seller performance (ROADMAP 3.4): own numbers vs the PLATFORM AVERAGE only —
// iron rule #3: no other org's individual numbers, aggregate comparisons only.
export default async function SellerPerformancePage() {
  const session = await auth();
  const ctx = session?.user?.id ? await getSellerContext(session.user.id) : null;
  if (!ctx) redirect("/seller");

  const [t, report] = await Promise.all([
    getTranslations("sellerPerf"),
    getPerformanceReport(ctx.orgId),
  ]);
  const { own, platform } = report;

  const fmt = {
    pct: (v: number | null) => (v == null ? "—" : `${v}%`),
    hours: (v: number | null) => (v == null ? "—" : t("hoursShort", { h: v })),
    n: (v: number) => v.toLocaleString(),
  };

  const metrics: { label: string; value: string; avg: string }[] = [
    {
      label: t("responseRate"),
      value: fmt.pct(own.responseRate),
      avg: fmt.pct(platform.responseRate),
    },
    {
      label: t("avgReply"),
      value: fmt.hours(own.avgResponseHours),
      avg: fmt.hours(platform.avgResponseHours),
    },
    {
      label: t("winRate"),
      value: fmt.pct(own.winRate),
      avg: fmt.pct(platform.winRate),
    },
    {
      label: t("received"),
      value: fmt.n(own.received),
      avg: fmt.n(platform.received),
    },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-1 text-sub">{t("subtitle")}</p>
        <p className="mt-1 text-xs text-mut">{t("aggregateNote")}</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label} className="gap-1" padded>
            <span className="text-xs text-mut">{m.label}</span>
            <span className="text-2xl font-bold tracking-tight text-ink">{m.value}</span>
            <span className="text-xs text-mut">
              {t("platformAvg")} {m.avg}
            </span>
          </Card>
        ))}
      </div>

      <Card className="mt-5 gap-1 p-5">
        <p className="text-sm text-sub">
          {t("slaReminder")}
        </p>
      </Card>
    </div>
  );
}
