"use client";

import { useTranslations } from "next-intl";
import { logout } from "@/lib/auth/actions";
import { Button } from "@/components/ui";

export function LogoutButton() {
  const t = useTranslations("common");
  return (
    <form action={logout}>
      <Button type="submit" variant="ghost" size="sm">
        {t("logout")}
      </Button>
    </form>
  );
}
