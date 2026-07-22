import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui";
import { getSharedSpecBook, listShareFeedback } from "@/lib/spec-book/service";
import type { SpecBookSnapshot } from "@/lib/spec-book/snapshot";
import { Logo } from "@/app/_components/logo";
import { GuestFeedback } from "./_components/guest-feedback";

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
  const [t, locale, feedback] = await Promise.all([
    getTranslations("share"),
    getLocale(),
    listShareFeedback(book.id),
  ]);
  const isEn = locale === "en";

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-surface px-5 py-4">
        <div className="mx-auto flex max-w-5xl flex-wrap items-baseline justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Logo />
              {/* 5F: view-only chip like the mock */}
              <span className="rounded-pill bg-canvas-2 px-2.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[.06em] text-sub">
                {t("viewOnly")} · {book.project.org.name}
              </span>
            </div>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">
              {snapshot.projectName}
            </h1>
            <p className="mt-0.5 text-sm text-sub">
              {[snapshot.buildingType, `${t("version")} ${book.version}`, snapshot.generatedAt]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <p className="font-mono text-[11px] text-mut">
            {t("noAccount")}
            {book.shareExpiresAt &&
              ` · ${t("expires")} ${new Intl.DateTimeFormat(
                locale === "th" ? "th-TH" : "en-GB",
                { dateStyle: "medium" },
              ).format(book.shareExpiresAt)}`}
          </p>
        </div>
      </header>

      {/* 5F: board mosaic + comments panel */}
      <section className="mx-auto grid max-w-5xl gap-6 px-5 py-6 lg:grid-cols-[1fr_300px]">
        <div className="grid h-fit grid-cols-2 gap-3 sm:grid-cols-3">
          {snapshot.items
            .filter((item) => item.options.length > 0)
            .map((item) => {
              const o =
                item.options.find((x) => x.isConfirmed) ?? item.options[0];
              const approvals = feedback.get(item.code)?.approvals ?? 0;
              return (
                <div
                  key={item.code}
                  className={`relative overflow-hidden rounded-card border border-line ${
                    o.isConfirmed ? "col-span-1 h-44 sm:h-52" : "h-32 opacity-70"
                  }`}
                  style={
                    o.image
                      ? undefined
                      : { backgroundColor: o.swatchHex ?? "#c9c2b4" }
                  }
                >
                  {o.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={o.image} alt={o.name} className="h-full w-full object-cover" />
                  )}
                  <span
                    className={`absolute left-2 top-2 rounded-pill px-2 py-0.5 font-mono text-[10px] font-semibold ${
                      approvals > 0
                        ? "bg-ok-soft text-ok"
                        : o.isConfirmed
                          ? "bg-white/90 text-sub"
                          : "bg-warn-soft text-warn"
                    }`}
                  >
                    {approvals > 0
                      ? `✓ ${t("approvedN", { n: approvals })}`
                      : o.isConfirmed
                        ? `✓ ${t("confirmed")}`
                        : `? ${t("reviewing")}`}
                  </span>
                  <span className="absolute bottom-2 left-2 max-w-[88%] rounded-[9px] bg-white/95 px-2.5 py-1.5 shadow-soft">
                    <span className="block font-mono text-[9px] leading-tight text-mut">
                      {item.code}
                      {!o.isConfirmed && " · opt"}
                    </span>
                    <span className="block truncate text-[11.5px] font-bold leading-tight text-ink">
                      {isEn && o.nameEn ? o.nameEn : o.name}
                    </span>
                  </span>
                </div>
              );
            })}
        </div>

        {/* Comments panel — every guest comment across the book */}
        <aside className="h-fit rounded-card border border-line bg-surface p-4">
          <h2 className="text-sm font-bold text-ink">{t("commentsTitle")}</h2>
          <div className="mt-3 flex flex-col gap-2.5">
            {[...feedback.entries()].flatMap(([code, fb]) =>
              fb.comments.map((c, i) => (
                <div key={`${code}-${i}`} className="rounded-sm border border-line bg-canvas px-3 py-2.5">
                  <div className="text-[13px] font-bold text-ink">
                    {c.guestName}
                    <span className="ml-1.5 font-mono text-[10px] font-normal text-mut">
                      {t("onItem")} {code}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[13px] leading-snug text-sub">{c.comment}</p>
                </div>
              )),
            )}
            {[...feedback.values()].every((f) => f.comments.length === 0) && (
              <p className="text-sm text-mut">{t("noComments")}</p>
            )}
          </div>
          <p className="mt-3 font-mono text-[10.5px] text-mut">{t("commentHint")}</p>
        </aside>
      </section>

      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-5 pb-6">
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
            <GuestFeedback
              token={token}
              itemCode={item.code}
              approvals={feedback.get(item.code)?.approvals ?? 0}
              comments={feedback.get(item.code)?.comments ?? []}
            />
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
