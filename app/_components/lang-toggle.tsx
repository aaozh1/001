"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocale } from "@/lib/i18n/actions";
import { locales, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/ui/cn";

// Whole-site language toggle. Writes the locale cookie via a server action, then
// refreshes so every Server Component re-renders in the new language.
export function LangToggle() {
  const active = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(locale: Locale) {
    if (locale === active || pending) return;
    startTransition(async () => {
      await setLocale(locale);
      router.refresh();
    });
  }

  return (
    <div
      className="inline-flex items-center rounded-pill border border-line-2 bg-surface p-0.5 text-sm"
      role="group"
      aria-label={t("language")}
    >
      {locales.map((locale) => {
        const selected = locale === active;
        return (
          <button
            key={locale}
            type="button"
            onClick={() => choose(locale)}
            aria-pressed={selected}
            disabled={pending}
            className={cn(
              "rounded-pill px-3 py-1 font-medium uppercase transition-colors",
              selected ? "bg-brand text-white" : "text-sub hover:text-ink",
            )}
          >
            {locale}
          </button>
        );
      })}
    </div>
  );
}
