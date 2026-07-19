// i18n configuration — TH is the default locale, EN is a toggle (see CLAUDE.md:
// "ภาษาใน UI ต้องมีทั้ง TH/EN (default TH)"). We use next-intl WITHOUT locale
// routing: the active locale lives in a cookie, so every URL stays clean and a
// single toggle flips the whole site (ROADMAP 0.3 AC "สลับภาษาทั้งเว็บได้").

export const locales = ["th", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "th";

// Cookie next-intl reads to resolve the request locale (see request.ts).
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
