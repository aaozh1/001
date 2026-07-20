"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui";

// Search box that drives the catalog via the URL (?q=), preserving every other
// active param (category preset, filters, sort) and resetting the page.
export function CatalogSearch({
  initial,
  basePath = "/designer/catalog",
}: {
  category?: string;
  initial: string;
  basePath?: string;
}) {
  const t = useTranslations("catalog");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initial);

  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      if (value.trim()) params.set("q", value.trim());
      else params.delete("q");
      const qs = params.toString();
      router.replace(`${basePath}${qs ? `?${qs}` : ""}`);
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
