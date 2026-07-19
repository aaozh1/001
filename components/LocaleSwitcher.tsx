"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { setLocale } from "@/lib/i18n/actions";
import { locales, localeNames, type Locale } from "@/lib/i18n/config";

// TH/EN toggle. Persists the choice to a cookie via a server action, then
// refreshes so server components re-render in the new language.
export function LocaleSwitcher() {
  const router = useRouter();
  const active = useLocale();
  const [pending, startTransition] = useTransition();

  function choose(locale: Locale) {
    if (locale === active) return;
    startTransition(async () => {
      await setLocale(locale);
      router.refresh();
    });
  }

  return (
    <div
      className="inline-flex overflow-hidden rounded-full border border-sand text-sm"
      role="group"
      aria-label="Language"
    >
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => choose(l)}
          disabled={pending}
          aria-pressed={l === active}
          className={
            l === active
              ? "bg-brand px-3 py-1 font-medium text-white"
              : "px-3 py-1 text-ink/70 hover:bg-brand/10"
          }
        >
          {localeNames[l]}
        </button>
      ))}
    </div>
  );
}
