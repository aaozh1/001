"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui";

// Search box that drives the catalog via the URL (?q=), preserving the category.
export function CatalogSearch({
  category,
  initial,
}: {
  category?: string;
  initial: string;
}) {
  const t = useTranslations("catalog");
  const router = useRouter();
  const [value, setValue] = useState(initial);

  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (value.trim()) params.set("q", value.trim());
      const qs = params.toString();
      router.replace(`/designer/catalog${qs ? `?${qs}` : ""}`);
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Input
      type="search"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={t("searchPlaceholder")}
      aria-label={t("searchPlaceholder")}
    />
  );
}
