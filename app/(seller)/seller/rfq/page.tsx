import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Badge, Card, buttonClasses } from "@/components/ui";
import { getSellerContext } from "@/lib/seller/context";
import { listSellerInbox } from "@/lib/quote/service";

export default async function SellerRfqInboxPage() {
  const session = await auth();
  const ctx = session?.user?.id ? await getSellerContext(session.user.id) : null;
  if (!ctx) redirect("/seller");

  const [t, locale, rfqs] = await Promise.all([
    getTranslations("sellerRfq"),
    getLocale(),
    listSellerInbox(ctx.orgId),
  ]);
  const now = Date.now();
  const dateFmt = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    dateStyle: "medium",
  });

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-1 text-sub">{t("subtitle")}</p>
        <p className="mt-1 text-xs text-mut">🔒 {t("privacy")}</p>
      </header>

      {rfqs.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-2 bg-surface p-10 text-center text-sub">
          {t("empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {rfqs.map((r) => {
            const overdue = r.slaDueAt ? new Date(r.slaDueAt).getTime() < now : false;
            return (
              <Card key={r.id} className="flex-row items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{r.projectName}</span>
                    {r.responded ? (
                      <Badge variant="ok">✓ {t("responded")}</Badge>
                    ) : overdue ? (
                      <Badge variant="warn">{t("overdue")}</Badge>
                    ) : null}
                    {r.wantSample && <Badge variant="brand">{t("wantSample")}</Badge>}
                  </div>
                  <div className="mt-1 truncate text-sm text-sub">
                    {r.materials.map((m) => m.name).join(", ")}
                    {r.qty ? ` · ${r.qty} ${r.qtyUnit ?? ""}` : ""}
                  </div>
                  {r.slaDueAt && (
                    <div className="mt-0.5 text-xs text-mut">
                      {t("sla")}: {dateFmt.format(new Date(r.slaDueAt))}
                    </div>
                  )}
                </div>
                <Link href={`/seller/rfq/${r.id}`} className={buttonClasses({ size: "sm" })}>
                  {r.responded ? t("open") : t("respond")}
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
