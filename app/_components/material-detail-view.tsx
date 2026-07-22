import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Card, Swatch } from "@/components/ui";
import { getMaterialDetail } from "@/lib/materials/service";
import { categoryLabel, categoryTexture } from "@/lib/materials/categories";
import { getDesignerContext } from "@/lib/projects/service";
import {
  averageStars,
  canReviewMaterial,
  listMaterialReviews,
} from "@/lib/reviews/service";
import { MaterialCard } from "@/app/(designer)/designer/catalog/_components/material-card";
import { MaterialReviews } from "./material-reviews";

// Material detail (design 3B): photo hero + colorway thumbs on the left with
// the seller card underneath; name/price/CTA/spec table on the right. Shared
// by the designer catalog and the PUBLIC catalog — `actionSlot` is the
// per-surface CTA.
export async function MaterialDetailView({
  id,
  basePath,
  canManage,
  actionSlot,
}: {
  id: string;
  basePath: string;
  canManage: boolean;
  actionSlot?: React.ReactNode;
}) {
  const m = await getMaterialDetail(id);
  if (!m) notFound();

  const [t, locale, session, reviews] = await Promise.all([
    getTranslations("catalog"),
    getLocale(),
    auth(),
    listMaterialReviews(id).catch(() => []),
  ]);
  const reviewerCtx = session?.user?.id
    ? await getDesignerContext(session.user.id).catch(() => null)
    : null;
  const canReview = reviewerCtx ? await canReviewMaterial(reviewerCtx.orgId, id) : false;
  const avg = averageStars(reviews);
  const reviewDateFmt = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    month: "short",
    year: "numeric",
  });
  const name = locale === "en" && m.nameEn ? m.nameEn : m.nameTh;
  const spec = locale === "en" && m.specEn ? m.specEn : m.specTh;
  const note = locale === "en" && m.noteEn ? m.noteEn : m.noteTh;

  // 3B spec table — label/value pairs laid out two per row like the mock.
  const facts: [string, string | null][] = [
    [t("sku"), m.sku],
    [t("color"), m.color],
    [t("size"), m.size],
    [t("keySpec"), spec],
    [t("std"), m.cert],
    [t("lead"), m.leadTime],
    [t("moq"), m.moq],
    [t("warranty"), m.warranty],
  ].filter(([, v]) => v && v !== "—") as [string, string][];

  const sellerInitials = (m.seller?.name ?? "??")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mx-auto max-w-5xl">
      <Link href={basePath} className="text-sm text-sub hover:text-ink">
        {t("backCatalog")}
      </Link>

      <div className="mt-3 grid gap-8 lg:grid-cols-[380px_1fr]">
        {/* ── Left: photo hero + thumbs + seller card ── */}
        <div className="flex h-fit flex-col gap-4">
          <div>
            <Card padded={false}>
              {m.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.images[0]}
                  alt={name}
                  className="block h-80 w-full rounded-card object-cover"
                />
              ) : (
                <Swatch
                  color={m.swatchHex ?? "#c9c2b4"}
                  texture={categoryTexture(m.category)}
                  className="h-80 rounded-none"
                />
              )}
            </Card>
            {m.images.length > 1 && (
              <div className="mt-2 grid grid-cols-4 gap-2">
                {m.images.slice(1).map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={img}
                    src={img}
                    alt={name}
                    loading="lazy"
                    className="h-16 w-full rounded-sm border border-line object-cover"
                  />
                ))}
              </div>
            )}
          </div>

          {m.seller && (
            <Card className="gap-3">
              <div>
                <p className="eyebrow">{t("madeBy")}</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-info-soft font-mono text-xs font-bold text-info">
                    {sellerInitials}
                  </span>
                  <span>
                    <span className="block font-bold text-ink">{m.seller.name}</span>
                    {m.seller.verified && (
                      <span className="font-mono text-[13.75px] text-ok">✓ {t("verified")}</span>
                    )}
                  </span>
                </div>
              </div>
              <Link
                href={canManage ? "/designer/chat" : "/login?callbackUrl=/designer/chat"}
                className="flex items-center justify-center rounded-sm bg-dark px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-dark-2"
              >
                {t("chatSeller")}
              </Link>
            </Card>
          )}
        </div>

        {/* ── Right: identity, price, CTA, spec table ── */}
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-sub">
            <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-canvas-2 font-mono text-[11.25px] font-bold text-sub">
              {sellerInitials}
            </span>
            {[m.brand, categoryLabel(m.category, locale)].filter(Boolean).join(" · ")}
            {m.seller?.verified && (
              <span className="rounded-pill bg-ok-soft px-2 py-0.5 font-mono text-[13.125px] text-ok">
                ✓ {t("verified")}
              </span>
            )}
          </div>
          <h1 className="mt-2 text-[35px] font-bold leading-tight tracking-tight text-ink">
            {name}
            {m.model ? <span className="text-sub"> · {m.model}</span> : null}
          </h1>
          {m.price && (
            <div className="mt-2 flex flex-wrap items-baseline gap-3">
              <span className="font-mono text-[27.5px] font-semibold text-brand-deep">
                ฿{Number(m.price).toLocaleString()}
                {m.unit ? (
                  <span className="text-[18.75px] font-normal text-sub"> / {m.unit}</span>
                ) : null}
              </span>
              {avg != null && (
                <span className="text-sm text-sub">
                  <span className="text-rating">★</span>{" "}
                  <span className="font-mono">{avg}</span> · {reviews.length}{" "}
                  {t("reviewsCount")}
                </span>
              )}
            </div>
          )}

          {actionSlot && <div className="mt-4">{actionSlot}</div>}

          {/* Specifications table */}
          {facts.length > 0 && (
            <div className="mt-5 overflow-hidden rounded-card border border-line">
              <div className="border-b border-line bg-canvas px-4 py-2.5 text-sm font-semibold text-ink">
                {t("detailSpec")}
              </div>
              <dl className="grid sm:grid-cols-2">
                {facts.map(([k, v], i) => (
                  <div
                    key={k}
                    className={`flex items-baseline justify-between gap-4 border-t border-line px-4 py-2.5 text-sm ${
                      i === 0 ? "border-t-0" : ""
                    } ${i === 1 ? "sm:border-t-0" : ""}`}
                  >
                    <dt className="shrink-0 text-mut">{k}</dt>
                    <dd className="text-right font-semibold text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {note && note !== "—" && (
            <p className="mt-4 rounded-sm border border-brand-line bg-brand-soft px-4 py-3 text-sm text-sub">
              <span className="font-semibold text-ink">{t("note")}: </span>
              {note}
            </p>
          )}

          {(m.specsheetUrl || m.catalogUrl) && (
            <div className="mt-4 flex flex-wrap gap-2.5">
              {m.specsheetUrl && (
                <a
                  href={m.specsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-sm border border-line-3 px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand"
                >
                  📄 {t("openSpecsheet")}
                </a>
              )}
              {m.catalogUrl && (
                <a
                  href={m.catalogUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-sm border border-line-3 px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand"
                >
                  📖 {t("openCatalogPdf")}
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <MaterialReviews
        materialId={id}
        canReview={canReview}
        reviews={reviews.map((r) => ({
          id: r.id,
          role: r.role,
          stars: r.stars,
          body: r.body,
          dateLabel: reviewDateFmt.format(r.createdAt),
        }))}
      />

      {m.related.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-semibold text-ink">{t("related")}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {m.related.map((r) => (
              <MaterialCard
                key={r.id}
                m={r}
                locale={locale}
                canManage={canManage}
                basePath={basePath}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
