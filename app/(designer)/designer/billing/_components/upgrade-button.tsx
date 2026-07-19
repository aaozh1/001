"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";

// Starts a checkout via the payment-gateway boundary. Real charging is Phase
// 3.5; today the gateway returns "unavailable", so we surface a "coming soon"
// note instead of pretending to bill.
export function UpgradeButton({ plan }: { plan: "pro" | "studio" }) {
  const t = useTranslations("billing");
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function upgrade() {
    if (pending) return;
    setPending(true);
    setNote(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as
        | { status: "unavailable" }
        | { status: "redirect"; url: string }
        | { error: { message: string } };
      if ("status" in data && data.status === "redirect") {
        window.location.href = data.url;
        return;
      }
      setNote(t("comingSoon"));
    } catch {
      setNote(t("comingSoon"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button size="sm" onClick={upgrade} disabled={pending}>
        {pending ? t("starting") : t("choosePlan")}
      </Button>
      {note && <p className="text-xs text-mut">{note}</p>}
    </div>
  );
}
