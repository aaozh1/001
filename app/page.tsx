import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { LangToggle } from "./_components/lang-toggle";
import { GlobalSearch } from "./_components/global-search";
import { CATEGORY_META, categoryIcon, categoryLabel } from "@/lib/materials/categories";

// Homepage — design handoff direction "1B Crisp centered": centered hero +
// search, category chips, app preview, stat band, 3-step how-it-works, dark
// "no paid placement" callout, CTA, footer.
export default async function Home() {
  const [t, locale, session] = await Promise.all([
    getTranslations("home1b"),
    getLocale(),
    auth(),
  ]);
  const loggedIn = !!session?.user;

  // Live numbers for the stat band — decoration only; never block the door.
  let counts: { materials: number; sellers: number } | null = null;
  try {
    const [materials, sellers] = await Promise.all([
      prisma.material.count({ where: { status: "published" } }),
      prisma.organization.count({ where: { type: "seller" } }),
    ]);
    counts = { materials, sellers };
  } catch {
    counts = null;
  }
  const stats: { value: string; label: string }[] = [
    { value: counts ? `${counts.materials.toLocaleString()}+` : "1,000+", label: t("stat1") },
    { value: counts ? `${counts.sellers.toLocaleString()}` : "28", label: t("stat2") },
    { value: "48h", label: t("stat3") },
    { value: "0", label: t("stat4") },
  ];

  const steps = [
    { no: "01", title: t("step1Title"), body: t("step1Body"), tint: "#fdf3e7" },
    { no: "02", title: t("step2Title"), body: t("step2Body"), tint: "#eaf1f7" },
    { no: "03", title: t("step3Title"), body: t("step3Body"), tint: "#e7f2ea" },
  ];

  const primaryBtn =
    "inline-flex items-center rounded-sm bg-brand px-[26px] py-[13px] text-[15px] font-semibold text-white transition hover:bg-brand-deep";
  const secondaryBtn =
    "inline-flex items-center rounded-sm border border-line-3 bg-surface px-[26px] py-[13px] text-[15px] font-semibold text-ink transition hover:border-brand hover:text-brand";

  return (
    <main className="flex min-h-screen flex-col bg-surface">
      {/* ── Nav ── */}
      <header className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-b border-line px-6 py-5 sm:px-12">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] bg-brand text-[16px] font-bold text-white">
            M
          </span>
          <span className="text-[20px] font-bold tracking-tight text-brand">MatList</span>
        </Link>
        <nav className="hidden items-center gap-[30px] md:flex">
          <Link href="/catalog" className="text-[14.5px] font-medium text-sub hover:text-ink">
            {t("navMaterials")}
          </Link>
          <a href="#how" className="text-[14.5px] font-medium text-sub hover:text-ink">
            {t("navHow")}
          </a>
          <Link href="/seller" className="text-[14.5px] font-medium text-sub hover:text-ink">
            {t("navSellers")}
          </Link>
          <Link href="/designer/billing" className="text-[14.5px] font-medium text-sub hover:text-ink">
            {t("navPricing")}
          </Link>
        </nav>
        <div className="flex items-center gap-3.5">
          <LangToggle />
          {loggedIn ? (
            <Link
              href="/designer"
              className="inline-flex rounded-sm bg-dark px-5 py-2.5 text-[14.5px] font-semibold text-white transition hover:bg-dark-2"
            >
              {t("myWorkspace")}
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-[14.5px] font-medium text-ink hover:text-brand">
                {t("login")}
              </Link>
              <Link
                href="/register"
                className="inline-flex rounded-sm bg-dark px-5 py-2.5 text-[14.5px] font-semibold text-white transition hover:bg-dark-2"
              >
                {t("signupFree")}
              </Link>
            </>
          )}
        </div>
      </header>

      {/* ── Hero (centered) ── */}
      <section className="flex flex-col items-center gap-6 px-6 pb-10 pt-16 text-center sm:px-12 sm:pt-20">
        <span className="inline-flex items-center gap-2 rounded-pill border border-brand-line bg-brand-soft px-3.5 py-[7px] font-mono text-[12px] uppercase tracking-[.1em] text-brand">
          {t("eyebrow")}
        </span>
        <h1 className="max-w-[820px] text-[38px] font-bold leading-[1.05] tracking-[-.03em] text-ink sm:text-[54px] lg:text-[60px] sm:leading-[1.02]">
          {t("h1")}
        </h1>
        <p className="max-w-[560px] text-[17px] leading-[1.55] text-[#6b6760] sm:text-[19px]">
          {t("heroSub")}
        </p>

        {/* Search — the real search box, styled per mock */}
        <div className="w-full max-w-[620px] rounded-card border border-line-2 bg-canvas p-2 shadow-[0_14px_30px_-22px_rgba(28,26,23,.3)]">
          <GlobalSearch target="/catalog" />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3.5">
          <Link href={loggedIn ? "/designer" : "/register"} className={primaryBtn}>
            {t("startFree")}
          </Link>
          <a href="#how" className={secondaryBtn}>
            {t("seeHow")}
          </a>
        </div>

        {/* Category chips — 14 families, straight into the open catalog */}
        <div className="mt-3 flex max-w-[760px] flex-wrap justify-center gap-2.5">
          {CATEGORY_META.map((c) => (
            <Link
              key={c.key}
              href={`/catalog?category=${encodeURIComponent(c.key)}`}
              className="inline-flex items-center gap-2 rounded-pill border border-line bg-canvas px-[15px] py-2 text-[13.5px] font-medium text-ink-2 transition hover:-translate-y-0.5 hover:border-brand hover:text-brand"
            >
              <span className="text-[15px] text-brand-deep">{categoryIcon(c.key)}</span>
              {categoryLabel(c.key, locale)}
            </Link>
          ))}
        </div>
      </section>

      {/* ── App preview slot ── */}
      <section className="px-6 sm:px-12">
        <Link
          href="/catalog"
          className="block h-[280px] overflow-hidden rounded-[18px] border border-[#eae4da] bg-canvas sm:h-[420px]"
          aria-label={t("previewAlt")}
        >
          {/* Placeholder until real product screenshot photography lands
              (handoff: image slots require real imagery). */}
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-[linear-gradient(135deg,#faf8f4_25%,#f5f2ec_25%,#f5f2ec_50%,#faf8f4_50%,#faf8f4_75%,#f5f2ec_75%)] bg-[length:28px_28px]">
            <span className="font-mono text-[12px] uppercase tracking-[.14em] text-mut">
              {t("previewLabel")}
            </span>
            <span className="rounded-pill border border-line-3 bg-surface px-4 py-2 text-sm font-semibold text-ink">
              {t("previewCta")} →
            </span>
          </div>
        </Link>
      </section>

      {/* ── Stat band ── */}
      <section className="mx-6 mt-14 overflow-hidden rounded-2xl border border-[#eee9e0] sm:mx-12">
        <div className="grid grid-cols-2 gap-px bg-[#eee9e0] sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-surface px-5 py-[26px] text-center">
              <div className="font-mono text-[26px] font-semibold tracking-[-.01em] text-brand-deep sm:text-[30px]">
                {s.value}
              </div>
              <div className="mt-1.5 text-[13px] text-mut">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="px-6 pb-14 pt-[72px] sm:px-12">
        <div className="mb-10 text-center">
          <span className="eyebrow">{t("howEyebrow")}</span>
          <h2 className="mt-3 text-[28px] font-bold tracking-[-.02em] text-ink sm:text-[34px]">
            {t("howTitle")}
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {steps.map((st) => (
            <div key={st.no} className="flex flex-col overflow-hidden rounded-2xl border border-line">
              <div
                className="flex h-[150px] items-center justify-center border-b border-line font-mono text-[44px] text-brand-deep/40"
                style={{ backgroundColor: st.tint }}
              >
                {st.no}
              </div>
              <div className="flex flex-col gap-2.5 p-[22px]">
                <span className="font-mono text-[13px] text-brand">{st.no}</span>
                <h3 className="text-[19px] font-semibold tracking-[-.01em] text-ink">{st.title}</h3>
                <p className="text-[14px] leading-[1.55] text-[#6b6760]">{st.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Neutrality callout (dark) ── */}
      <section className="mx-6 sm:mx-12">
        <div className="flex flex-col items-center gap-4 rounded-[20px] bg-dark px-8 py-16 text-center sm:px-14">
          <span className="font-mono text-[12px] uppercase tracking-[.14em] text-brand-bright">
            {t("ruleEyebrow")}
          </span>
          <h2 className="max-w-[660px] text-[28px] font-bold leading-[1.1] tracking-[-.02em] text-white sm:text-[38px]">
            {t("ruleTitle")}
          </h2>
          <p className="max-w-[560px] text-[15px] leading-[1.6] text-dark-text sm:text-[16px]">
            {t("ruleBody")}
          </p>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="flex flex-col items-center gap-5 px-6 py-[72px] text-center sm:px-12">
        <h2 className="max-w-[620px] text-[28px] font-bold leading-[1.08] tracking-[-.025em] text-ink sm:text-[38px]">
          {t("ctaTitle")}
        </h2>
        <p className="max-w-[460px] text-[15px] leading-[1.55] text-[#6b6760] sm:text-[16px]">
          {t("ctaSub")}
        </p>
        <div className="mt-1 flex flex-wrap justify-center gap-3.5">
          <Link href={loggedIn ? "/designer" : "/register"} className={primaryBtn}>
            {t("ctaPrimary")}
          </Link>
          <Link href="/seller" className={secondaryBtn}>
            {t("ctaSeller")}
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-line px-6 py-9 text-[13px] text-mut sm:px-12">
        <div className="flex items-center gap-2.5">
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-brand text-[14px] font-bold text-white">
            M
          </span>
          <span className="text-[15px] font-bold text-brand">MatList</span>
          <span className="ml-2 font-mono text-[11.5px]">{t("tagline")}</span>
        </div>
        <div className="flex flex-wrap gap-7">
          <Link href="/catalog" className="hover:text-ink">
            {t("navMaterials")}
          </Link>
          <Link href="/designer/billing" className="hover:text-ink">
            {t("navPricing")}
          </Link>
          <Link href="/seller" className="hover:text-ink">
            {t("navSellers")}
          </Link>
          <Link href="/legal/terms" className="hover:text-ink">
            {t("terms")}
          </Link>
          <Link href="/legal/privacy" className="hover:text-ink">
            {t("privacy")}
          </Link>
        </div>
      </footer>
    </main>
  );
}
