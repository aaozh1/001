import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Badge, Card } from "@/components/ui";
import { cn } from "@/lib/ui/cn";
import { canManageBilling } from "@/lib/permissions";
import { getDesignerContext } from "@/lib/projects/service";
import { getSubscription, listInvoices } from "@/lib/billing/service";
import {
  DESIGNER_PLANS,
  DESIGNER_PLAN_ORDER,
  isUpgrade,
} from "@/lib/billing/plans";
import { UpgradeButton } from "./_components/upgrade-button";

export default async function BillingPage() {
  const session = await auth();
  const ctx = session?.user?.id ? await getDesignerContext(session.user.id) : null;
  if (!ctx) redirect("/login?callbackUrl=/designer/billing");

  const [t, locale, sub, invoices] = await Promise.all([
    getTranslations("billing"),
    getLocale(),
    getSubscription(ctx.orgId),
    listInvoices(ctx.orgId),
  ]);
  const owner = canManageBilling(ctx.role);
  const dateFmt = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    dateStyle: "medium",
  });

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/designer" className="text-sm text-sub hover:text-ink">
        {t("back")}
      </Link>
      {/* 3K: centered pricing header with eyebrow */}
      <header className="mt-4 text-center">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="mt-1 text-[32.5px] font-bold tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-1 text-sub">{t("subtitle")}</p>
      </header>

      {!owner && <p className="mt-3 text-center text-xs text-warn">{t("ownerOnly")}</p>}

      {/* Plan comparison — Pro carries the POPULAR chip + tinted ring */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {DESIGNER_PLAN_ORDER.map((id) => {
          const plan = DESIGNER_PLANS[id];
          const current = id === sub.plan;
          const upgradeable = owner && isUpgrade(sub.plan, id);
          return (
            <Card
              key={id}
              className={cn(
                "gap-3",
                id === "pro" && "border-brand bg-brand-soft/40",
                current && "ring-2 ring-brand",
              )}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-ink">{t(`plan.${id}`)}</h2>
                {current ? (
                  <Badge variant="brand">{t("current")}</Badge>
                ) : id === "pro" ? (
                  <span className="font-mono text-[12.5px] font-semibold uppercase tracking-[.08em] text-brand">
                    {t("popular")}
                  </span>
                ) : null}
              </div>
              <p className="font-mono text-[32.5px] font-semibold tracking-tight text-ink">
                ฿{plan.priceThb.toLocaleString()}
                <span className="font-sans text-sm font-normal text-mut">
                  {plan.priceThb === 0 ? ` ${t("forever")}` : ` ${t("perSeatMonth")}`}
                </span>
              </p>
              <hr className="border-line" />
              <ul className="flex flex-col gap-1.5 text-sm text-sub">
                {plan.featureKeys.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-brand">✓</span>
                    {t(`feat.${f}`)}
                  </li>
                ))}
              </ul>
              {current ? (
                <span className="rounded-sm border border-line-3 px-4 py-2 text-center text-sm font-semibold text-ink">
                  {t("onThisPlan")}
                </span>
              ) : upgradeable && id === "pro" ? (
                <UpgradeButton plan="pro" />
              ) : upgradeable && id === "studio" ? (
                <UpgradeButton plan="studio" dark />
              ) : null}
            </Card>
          );
        })}
      </div>

      {/* Tax invoices — full-form tax invoice is mandatory for Thai offices. */}
      <Card className="mt-5 gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink">{t("invoices")}</h2>
          <span className="text-xs text-mut">{t("taxNote")}</span>
        </div>
        {invoices.length === 0 ? (
          <p className="text-sm text-sub">{t("noInvoices")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-mut">
                  <th className="py-2 font-semibold">{t("colDate")}</th>
                  <th className="py-2 font-semibold">{t("colAmount")}</th>
                  <th className="py-2 font-semibold">{t("colTaxInvoice")}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-line last:border-0">
                    <td className="py-2 text-sub">{dateFmt.format(new Date(inv.issuedAt))}</td>
                    <td className="py-2 text-ink">฿{Number(inv.amount).toLocaleString()}</td>
                    <td className="py-2">
                      {inv.taxInvoiceUrl ? (
                        <a
                          href={inv.taxInvoiceUrl}
                          className="text-brand hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t("download")}
                        </a>
                      ) : (
                        <span className="text-mut">{t("preparing")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="mt-6 text-center font-mono text-[14.375px] text-mut">
        {t("neutralityNote")}
      </p>
    </div>
  );
}
