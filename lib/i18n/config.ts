// i18n configuration — TH is the default locale, EN is a toggle (see CLAUDE.md:
// "ภาษาใน UI ต้องมีทั้ง TH/EN (default TH)"). Locale is stored in the
// NEXT_LOCALE cookie (no URL prefix) to mirror the prototype's in-place toggle.

export const locales = ["th", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "th";

export const localeNames: Record<Locale, string> = {
  th: "ไทย",
  en: "English",
};

export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}
