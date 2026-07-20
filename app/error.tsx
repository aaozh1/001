"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";

// Route-level error boundary (Phase 4.3): the user gets a way forward, the
// error goes to the server log (visible to any log-based alerting).
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error("[route-error]", error.digest ?? "", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-10 text-center">
      <p className="text-4xl">😵</p>
      <h1 className="text-xl font-bold text-ink">{t("title")}</h1>
      <p className="text-sm text-sub">{t("body")}</p>
      {error.digest && <p className="text-xs text-mut">ref: {error.digest}</p>}
      <Button onClick={reset}>{t("retry")}</Button>
    </div>
  );
}
