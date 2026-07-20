import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Card } from "@/components/ui";
import { getMetricsReport, isOpsEmail } from "@/lib/analytics/report-service";
import type { FunnelStep } from "@/lib/analytics/events";

// Operator metrics (Phase 4.2) — replaces the prototype's in-session metrics
// panel with persistent funnels. Gated by the OPS_EMAILS allowlist; everyone
// else gets a plain 404 (the page's existence is not advertised).
export default async function OpsMetricsPage() {
  const session = await auth();
  if (!isOpsEmail(session?.user?.email)) notFound();

  const [t, report] = await Promise.all([
    getTranslations("ops"),
    getMetricsReport(30),
  ]);

  const funnelTable = (title: string, steps: FunnelStep[]) => (
    <Card className="gap-3">
      <h2 className="font-semibold text-ink">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-mut">
              <th className="py-2 font-semibold">{t("colStep")}</th>
              <th className="py-2 font-semibold">{t("colOrgs")}</th>
              <th className="py-2 font-semibold">{t("colOfFirst")}</th>
              <th className="py-2 font-semibold">{t("colOfPrev")}</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((s) => (
              <tr key={s.event} className="border-b border-line last:border-0">
                <td className="py-2 font-medium text-ink">{s.event}</td>
                <td className="py-2 text-sub">{s.orgs}</td>
                <td className="py-2 text-sub">
                  {s.pctOfFirst == null ? "—" : `${s.pctOfFirst}%`}
                </td>
                <td className="py-2 text-sub">
                  {s.pctOfPrev == null ? "—" : `${s.pctOfPrev}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-1 text-sub">
          {t("subtitle", { days: report.days, total: report.totalEvents })}
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {funnelTable(t("designerFunnel"), report.designerFunnel)}
        {funnelTable(t("sellerFunnel"), report.sellerFunnel)}

        <Card className="gap-3">
          <h2 className="font-semibold text-ink">{t("topEvents")}</h2>
          {report.topEvents.length === 0 ? (
            <p className="text-sm text-sub">{t("noEvents")}</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {report.topEvents.map((e) => (
                <li key={e.event} className="flex justify-between gap-4">
                  <span className="text-ink">{e.event}</span>
                  <span className="text-sub">{e.count.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
