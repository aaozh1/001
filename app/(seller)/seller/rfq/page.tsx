import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { getSellerContext } from "@/lib/seller/context";
import { listSellerInbox } from "@/lib/quote/service";
import { InboxList, type InboxRow } from "./_components/inbox-list";

export default async function SellerRfqInboxPage() {
  const session = await auth();
  const ctx = session?.user?.id ? await getSellerContext(session.user.id) : null;
  if (!ctx) redirect("/seller");

  const [t, locale, rfqs] = await Promise.all([
    getTranslations("sellerRfq"),
    getLocale(),
    listSellerInbox(ctx.orgId),
  ]);
  const dateFmt = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    dateStyle: "medium",
  });

  const rows: InboxRow[] = rfqs.map((r) => ({
    id: r.id,
    projectName: r.projectName,
    materials: r.materials.map((m) => m.name).join(", "),
    qtyLabel: r.qty ? `${r.qty} ${r.qtyUnit ?? ""}` : "",
    slaDueAt: r.slaDueAt,
    slaDateLabel: r.slaDueAt ? dateFmt.format(new Date(r.slaDueAt)) : "",
    status: r.status,
    responded: r.responded,
    quoteStatus: r.quoteStatus,
    wantSample: r.wantSample,
  }));

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-1 text-sub">{t("subtitle")}</p>
        <p className="mt-1 text-xs text-mut">🔒 {t("privacy")}</p>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-2 bg-surface p-10 text-center text-sub">
          {t("empty")}
        </p>
      ) : (
        <InboxList rows={rows} />
      )}
    </div>
  );
}
