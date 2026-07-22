import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { LangToggle } from "./_components/lang-toggle";
import { GlobalSearch } from "./_components/global-search";
import { Logo } from "./_components/logo";
import { CATEGORY_META, categoryIcon, categoryLabel } from "@/lib/materials/categories";

// Homepage — design direction "1A warm editorial": left-aligned hero with a
// floating quote card, trust strip, material-family card grid, 3 steps,
// Material Board feature block, brick CTA band, dark footer.
export default async function Home() {
  const [t, locale, session] = await Promise.all([
    getTranslations("home1a"),
    getLocale(),
    auth(),
  ]);
  const loggedIn = !!session?.user;

  // Live decoration — category counts + verified seller initials. Fail-safe:
  // the door must open even with the database down.
  let counts = new Map<string, number>();
  let sellerChips: string[] = [];
  try {
    const [byCat, sellers] = await Promise.all([
      prisma.material.groupBy({
        by: ["category"],
        where: { status: "published" },
        _count: { _all: true },
      }),
      prisma.organization.findMany({
        where: { type: "seller" },
        select: { name: true },
        take: 7,
      }),
    ]);
    counts = new Map(byCat.map((c) => [c.category, c._count._all]));
    sellerChips = sellers.map((s) =>
      s.name
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    );
  } catch {
    // Decoration only.
  }

  const steps = [
    { no: "01", title: t("step1Title"), body: t("step1Body") },
    { no: "02", title: t("step2Title"), body: t("step2Body") },
    { no: "03", title: t("step3Title"), body: t("step3Body") },
  ];

  const navLink = "text-[18.125px] font-medium text-sub hover:text-ink";

  return (
    <main className="flex min-h-screen flex-col bg-canvas">
      {/* ── Nav ── */}
      <header className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-b border-line bg-surface px-6 py-4 sm:px-12">
        <Link href="/" className="flex items-baseline gap-3">
          <Logo />
          <span className="hidden font-mono text-[14.375px] text-mut sm:inline">
            {t("tagline")}
          </span>
        </Link>
        <nav className="hidden items-center gap-[30px] md:flex">
          <Link href="/catalog" className={navLink}>
            {t("navMaterials")}
          </Link>
          <a href="#how" className={navLink}>
            {t("navHow")}
          </a>
          <Link href="/seller" className={navLink}>
            {t("navSellers")}
          </Link>
          <Link href="/designer/billing" className={navLink}>
            {t("navPricing")}
          </Link>
        </nav>
        <div className="flex items-center gap-3.5">
          <LangToggle />
          {loggedIn ? (
            <Link
              href="/designer"
              className="inline-flex rounded-pill bg-brand px-5 py-2 text-[18.125px] font-semibold text-white transition hover:bg-brand-deep"
            >
              {t("myWorkspace")}
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-[18.125px] font-medium text-ink hover:text-brand">
                {t("login")}
              </Link>
              <Link
                href="/register"
                className="inline-flex rounded-pill bg-brand px-5 py-2 text-[18.125px] font-semibold text-white transition hover:bg-brand-deep"
              >
                {t("signup")}
              </Link>
            </>
          )}
        </div>
      </header>

      {/* ── Hero: copy left, hero card right ── */}
      <section className="grid gap-10 px-6 pb-16 pt-14 sm:px-12 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div className="max-w-[560px]">
          <p className="eyebrow">◆ {t("eyebrow")}</p>
          <h1 className="mt-4 text-[50px] font-bold leading-[1.06] tracking-[-.03em] text-ink sm:text-[65px]">
            {t.rich("h1", {
              nb: (chunk) => <span className="whitespace-nowrap">{chunk}</span>,
            })}
          </h1>
          <p className="mt-5 max-w-[460px] text-[20.625px] leading-[1.6] text-sub">
            {t("heroBody")}
          </p>

          <div className="mt-6 max-w-[440px] rounded-pill border border-line-2 bg-surface p-1.5 shadow-soft">
            <GlobalSearch target="/catalog" />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3.5">
            <Link
              href={loggedIn ? "/designer" : "/register"}
              className="inline-flex items-center rounded-[12px] bg-brand px-[24px] py-[13px] text-[18.75px] font-semibold text-white transition hover:bg-brand-deep"
            >
              {t("ctaSchedule")}
            </Link>
            <Link
              href="/catalog"
              className="inline-flex items-center rounded-[12px] border border-line-3 bg-surface px-[24px] py-[13px] text-[18.75px] font-semibold text-ink transition hover:border-brand hover:text-brand"
            >
              {t("ctaBrowse")}
            </Link>
          </div>
          <p className="mt-4 font-mono text-[14.375px] text-mut">{t("neutralNote")}</p>
        </div>

        {/* Hero card: real schedule screenshot + floating best-offer card */}
        <div className="relative mx-auto w-full max-w-[560px]">
          <div className="overflow-hidden rounded-[22px] border border-line bg-surface shadow-lifted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/preview-schedule.png"
              alt={t("heroShotAlt")}
              className="h-[340px] w-full object-cover object-top sm:h-[400px]"
            />
          </div>
          <div className="absolute -bottom-6 left-4 w-[240px] rounded-card border border-line bg-surface p-4 shadow-lifted sm:left-8">
            <div className="flex items-center justify-between">
              <span className="rounded-[6px] border border-line px-1.5 py-0.5 font-mono text-[12.5px] text-sub">
                FL-01
              </span>
              <span className="rounded-pill bg-quoted-soft px-2 py-0.5 font-mono text-[12.5px] font-semibold text-quoted">
                {t("cardQuoted")}
              </span>
            </div>
            <div className="mt-2 text-sm font-bold text-ink">{t("cardName")}</div>
            <div className="text-xs text-sub">{t("cardMeta")}</div>
            <div className="mt-2 flex items-baseline justify-between border-t border-line pt-2">
              <span className="text-[13.75px] text-mut">{t("cardBestOffer")}</span>
              <span className="font-mono text-[18.75px] font-bold text-brand-deep">{t("cardPrice")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="border-y border-line bg-canvas-2 px-6 py-4 sm:px-12">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-mono text-[14.375px] text-mut">{t("trust")}</span>
          <span className="flex flex-wrap gap-1.5">
            {(sellerChips.length > 0 ? sellerChips : ["GC", "ET", "ST", "SF", "WW"]).map(
              (chip, i) => (
                <span
                  key={`${chip}-${i}`}
                  className="rounded-[7px] border border-line bg-surface px-2 py-1 font-mono text-[13.125px] font-semibold text-sub"
                >
                  {chip}
                </span>
              ),
            )}
          </span>
        </div>
      </section>

      {/* ── Catalog: material family cards ── */}
      <section className="bg-surface px-6 py-16 sm:px-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-[480px]">
            <p className="eyebrow">{t("catalogEyebrow")}</p>
            <h2 className="mt-2 text-[37.5px] font-bold leading-tight tracking-[-.02em] text-ink">
              {t("catalogTitle")}
            </h2>
            <p className="mt-2 text-[18.125px] leading-relaxed text-sub">{t("catalogSub")}</p>
          </div>
          <Link href="/catalog" className="text-sm font-bold text-brand hover:underline">
            {t("allFamilies", { n: CATEGORY_META.length })} →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 lg:grid-cols-4">
          {CATEGORY_META.map((c) => (
            <Link
              key={c.key}
              href={`/catalog?category=${encodeURIComponent(c.key)}`}
              className="flex items-center gap-3 rounded-card border border-line bg-canvas px-4 py-3.5 transition hover:-translate-y-0.5 hover:border-brand hover:shadow-soft"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-brand-soft text-[20px] text-brand-deep">
                {categoryIcon(c.key)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[17.5px] font-bold text-ink">
                  {categoryLabel(c.key, locale)}
                </span>
                <span className="block font-mono text-[13.125px] text-mut">
                  {t("nItems", { n: counts.get(categoryLabel(c.key, "th")) ?? counts.get(c.key) ?? 0 })}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 3 steps ── */}
      <section id="how" className="border-y border-line bg-canvas px-6 py-16 sm:px-12">
        <div className="mb-9 text-center">
          <h2 className="text-[35px] font-bold tracking-[-.02em] text-ink">{t("howTitle")}</h2>
          <p className="mt-2 text-[18.75px] text-sub">{t("howSub")}</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {steps.map((st) => (
            <div key={st.no} className="rounded-card border border-line bg-surface p-6">
              <span className="font-mono text-[16.25px] text-brand">{st.no}</span>
              <h3 className="mt-2 text-[22.5px] font-bold tracking-[-.01em] text-ink">{st.title}</h3>
              <p className="mt-2 text-[17.5px] leading-[1.6] text-sub">{st.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Material Board feature ── */}
      <section className="grid gap-10 bg-surface px-6 py-16 sm:px-12 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div className="overflow-hidden rounded-[22px] border border-line shadow-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/preview-board.png"
            alt={t("boardAlt")}
            className="h-[300px] w-full object-cover sm:h-[380px]"
          />
        </div>
        <div className="max-w-[460px]">
          <p className="eyebrow">{t("boardEyebrow")}</p>
          <h2 className="mt-2 text-[37.5px] font-bold leading-tight tracking-[-.02em] text-ink">
            {t("boardTitle")}
          </h2>
          <p className="mt-3 text-[18.75px] leading-[1.65] text-sub">{t("boardBody")}</p>
          <ul className="mt-5 flex flex-col gap-2.5 text-[18.125px] text-ink-2">
            {(["boardB1", "boardB2", "boardB3"] as const).map((k) => (
              <li key={k} className="flex items-start gap-2.5">
                <span className="mt-0.5 text-brand">✓</span>
                {t(k)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Brick CTA band ── */}
      <section className="bg-brand-deep px-6 py-16 text-center sm:px-12">
        <h2 className="mx-auto max-w-[560px] text-[37.5px] font-bold leading-[1.15] tracking-[-.02em] text-white sm:text-[42.5px]">
          {t("ctaTitle")}
        </h2>
        <p className="mx-auto mt-3 max-w-[460px] text-[18.75px] leading-relaxed text-white/85">
          {t("ctaSub")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3.5">
          <Link
            href={loggedIn ? "/designer" : "/register"}
            className="inline-flex items-center rounded-[12px] bg-white px-[24px] py-[13px] text-[18.75px] font-semibold text-brand-deep transition hover:bg-brand-soft"
          >
            {t("ctaPrimary")}
          </Link>
          <Link
            href="/seller"
            className="inline-flex items-center rounded-[12px] border border-white/50 px-[24px] py-[13px] text-[18.75px] font-semibold text-white transition hover:border-white"
          >
            {t("ctaSeller")}
          </Link>
        </div>
        <p className="mt-5 font-mono text-[14.375px] text-white/70">{t("ctaNote")}</p>
      </section>

      {/* ── Dark footer ── */}
      <footer className="bg-dark px-6 py-12 sm:px-12">
        <div className="flex flex-wrap items-start justify-between gap-10">
          <div>
            <Logo className="text-white" />
            <p className="mt-2 font-mono text-[14.375px] text-dark-text">{t("tagline")}</p>
          </div>
          <div className="flex flex-wrap gap-16 text-[16.875px]">
            <div>
              <div className="mb-3 font-mono text-[13.75px] uppercase tracking-[.1em] text-dark-text">
                {t("footProduct")}
              </div>
              <div className="flex flex-col gap-2">
                <Link href="/catalog" className="text-white/85 hover:text-white">
                  {t("navMaterials")}
                </Link>
                <Link href="/register" className="text-white/85 hover:text-white">
                  {t("footSchedule")}
                </Link>
                <Link href="/seller" className="text-white/85 hover:text-white">
                  {t("navSellers")}
                </Link>
              </div>
            </div>
            <div>
              <div className="mb-3 font-mono text-[13.75px] uppercase tracking-[.1em] text-dark-text">
                {t("footCompany")}
              </div>
              <div className="flex flex-col gap-2">
                <Link href="/designer/billing" className="text-white/85 hover:text-white">
                  {t("navPricing")}
                </Link>
                <Link href="/legal/terms" className="text-white/85 hover:text-white">
                  {t("terms")}
                </Link>
                <Link href="/legal/privacy" className="text-white/85 hover:text-white">
                  {t("privacy")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
