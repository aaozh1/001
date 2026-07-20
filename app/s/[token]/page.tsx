import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui";
import { getSharedSpecBook } from "@/lib/spec-book/service";
import type { SpecBookSnapshot } from "@/lib/spec-book/snapshot";

type Props = { params: Promise<{ token: string }> };

// PUBLIC Spec Book share page (/s/xxxx) — the frozen snapshot, readable on a
// phone at the job site. No login; the link can be revoked any time. Contains
// only spec content the designer chose to share — no org internals, no chat,
// no quotes.
export default async function SharedSpecBookPage({ params }: Props) {
  const { token } = await params;
  const book = await getSharedSpecBook(token);
  if (!book?.snapshot) notFound();

  const snapshot = book.snapshot as unknown as SpecBookSnapshot;
  const [t, locale] = await Promise.all([getTranslations("share"), getLocale()]);
  const isEn = locale === "en";

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-surface px-5 py-4">
        <div className="mx-auto flex max-w-3xl items-baseline justify-between gap-3">
          <div>
            <div className="text-lg font-bold text-brand">MatList</div>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">
              {snapshot.projectName}
            </h1>
            <p className="mt-0.5 text-sm text-sub">
              {[snapshot.buildingType, `${t("version")} ${book.version}`, snapshot.generatedAt]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-5 py-6">
        {snapshot.items.map((item) => (
          <section
            key={item.code}
            className="rounded-card border border-line bg-surface p-4 shadow-soft"
          >
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-bold text-ink">{item.code}</span>
              <span className="text-sm text-sub">
                {[item.zone, item.category, item.qty ? `${item.qty} ${item.qtyUnit ?? ""}` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
            {item.options.length === 0 ? (
              <p className="mt-2 text-sm text-mut">—</p>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                {item.options.map((o, i) => (
                  <div key={i} className="flex gap-3">
                    {o.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={o.image}
                        alt={o.name}
                        className="h-14 w-14 shrink-0 rounded-sm border border-line object-cover"
                      />
                    ) : (
                      <span
                        className="h-14 w-14 shrink-0 rounded-sm border border-line"
                        style={{ backgroundColor: o.swatchHex ?? "#c9c2b4" }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-ink">
                          {isEn && o.nameEn ? o.nameEn : o.name}
                        </span>
                        {o.isConfirmed && <Badge variant="ok">✓ {t("confirmed")}</Badge>}
                      </div>
                      <div className="text-xs text-sub">
                        {[o.brand, o.model, o.sellerName].filter(Boolean).join(" · ")}
                      </div>
                      <div className="mt-0.5 text-xs text-mut">
                        {[
                          o.price ? `฿${o.price}${o.unit ? `/${o.unit}` : ""}` : null,
                          isEn && o.specEn ? o.specEn : o.specTh,
                          o.cert,
                          o.leadTime,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </main>

      <footer className="border-t border-line bg-surface px-5 py-4 text-center text-sm">
        <span className="text-sub">{t("madeWith")} </span>
        <Link href="/" className="font-bold text-brand hover:underline">
          MatList
        </Link>
        <span className="text-sub"> — {t("cta")}</span>
      </footer>
    </div>
  );
}
