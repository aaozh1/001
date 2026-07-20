import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Badge, Card } from "@/components/ui";
import { getSellerContext } from "@/lib/seller/context";
import { getSellerRfqDetail } from "@/lib/quote/service";
import { QuoteBuilder } from "./_components/quote-builder";

type Props = { params: Promise<{ id: string }> };

export default async function SellerRfqDetailPage({ params }: Props) {
  const session = await auth();
  const ctx = session?.user?.id ? await getSellerContext(session.user.id) : null;
  if (!ctx) redirect("/seller");

  const { id } = await params;
  const rfq = await getSellerRfqDetail(ctx.orgId, id);
  if (!rfq) notFound();
  const t = await getTranslations("sellerRfq");

  const fact = (label: string, value: string | null) =>
    value ? (
      <div>
        <dt className="text-xs text-mut">{label}</dt>
        <dd className="text-ink">{value}</dd>
      </div>
    ) : null;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/seller/rfq" className="text-sm text-sub hover:text-ink">
        {t("back")}
      </Link>

      <header className="mt-2 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{rfq.projectName}</h1>
        {rfq.quoteStatus === "selected" ? (
          <Badge variant="ok">{t("won")}</Badge>
        ) : rfq.quoteStatus === "rejected" ? (
          <Badge variant="neutral">{t("lost")}</Badge>
        ) : rfq.responded ? (
          <Badge variant="ok">✓ {t("responded")}</Badge>
        ) : null}
        {rfq.wantSample && <Badge variant="brand">{t("wantSample")}</Badge>}
      </header>
      <p className="mt-1 text-xs text-mut">🔒 {t("privacy")}</p>

      <Card className="mt-4">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          {fact(t("material"), rfq.materials.map((m) => m.name).join(", ") || "—")}
          {fact(t("qty"), rfq.qty ? `${rfq.qty} ${rfq.qtyUnit ?? ""}` : null)}
          {fact("Zone", rfq.zone)}
          {fact(t("note"), rfq.note)}
        </dl>
      </Card>

      <Card className="mt-4 gap-4">
        <h2 className="font-semibold text-ink">{t("quoteTitle")}</h2>
        {rfq.quoteStatus === "selected" || rfq.quoteStatus === "rejected" ? (
          <div className="text-sm">
            <p className={rfq.quoteStatus === "selected" ? "text-ok" : "text-sub"}>
              {rfq.quoteStatus === "selected" ? t("won") : t("lost")}
            </p>
            {rfq.existingQuote && (
              <p className="mt-1 text-mut">
                {t("yourQuote")}: ฿{rfq.existingQuote.pricePerUnit}
                {t("perUnit")}
              </p>
            )}
          </div>
        ) : (
          <QuoteBuilder rfqId={rfq.id} existing={rfq.existingQuote} />
        )}
      </Card>
    </div>
  );
}
