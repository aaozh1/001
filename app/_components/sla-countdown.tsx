"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { slaRemaining } from "@/lib/quote/inbox-tabs";
import { cn } from "@/lib/ui/cn";

// Live SLA countdown (AC 3.3: "SLA countdown จริง"). Renders nothing on the
// server and until mounted — the remaining time depends on the client clock,
// so this avoids a hydration mismatch — then ticks every 30s.
export function SlaCountdown({
  slaDueAt,
  className,
}: {
  slaDueAt: string | null;
  className?: string;
}) {
  const t = useTranslations("sellerRfq");
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (nowMs === null) return null;
  const r = slaRemaining(slaDueAt, nowMs);
  if (r.state === "none") return null;

  if (r.state === "overdue") {
    return (
      <span className={cn("font-medium text-warn", className)}>
        ⏰ {t("slaOverdueBy", { hours: r.hours })}
      </span>
    );
  }
  const urgent = r.hours < 6;
  return (
    <span className={cn(urgent ? "font-medium text-warn" : "text-sub", className)}>
      ⏳ {t("slaLeft", { hours: r.hours, minutes: r.minutes })}
    </span>
  );
}
