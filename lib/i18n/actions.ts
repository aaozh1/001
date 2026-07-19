"use server";

import { cookies } from "next/headers";
import { isLocale, LOCALE_COOKIE, type Locale } from "./config";

// Server action invoked by the language toggle. Persists the chosen locale in a
// cookie; the client refreshes so every Server Component re-renders in the new
// language. One toggle, whole site — no per-page locale state.
export async function setLocale(locale: Locale) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  });
}
