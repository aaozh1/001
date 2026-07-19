"use client";

import { useTranslations } from "next-intl";
import { logout } from "@/lib/auth/actions";

export function LogoutButton() {
  const t = useTranslations("common");
  return (
    <form action={logout}>
      <button
        type="submit"
        className="rounded-full border border-sand px-3 py-1 text-sm font-medium text-muted hover:border-brand hover:text-ink"
      >
        {t("logout")}
      </button>
    </form>
  );
}
