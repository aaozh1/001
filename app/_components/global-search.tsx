"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/ui/cn";

// Header search — available on every page: submits to the given catalog
// (public /catalog, or /designer/catalog inside the designer workspace).
export function GlobalSearch({
  target = "/catalog",
  className,
}: {
  target?: string;
  className?: string;
}) {
  const t = useTranslations("common");
  const router = useRouter();
  const [value, setValue] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `${target}?q=${encodeURIComponent(q)}` : target);
  }

  return (
    <form onSubmit={submit} role="search" data-global-search className={cn("relative", className)}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sub">
        🔍
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("searchMaterials")}
        aria-label={t("searchMaterials")}
        className="w-full rounded-pill border border-line-2 bg-canvas py-2 pl-9 pr-4 text-sm text-ink outline-none transition focus:border-brand focus:bg-surface focus:ring-[3px] focus:ring-brand-soft"
      />
    </form>
  );
}
