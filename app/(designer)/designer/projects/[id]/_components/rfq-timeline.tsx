"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/ui/cn";
import { nudgeSellerAction } from "@/lib/rfq/nudge-action";
import type { RfqTrackView } from "./types";

// 5D RFQ tracking — a per-seller step timeline (sent → opened → quoted) with a
// nudge for sellers who have gone quiet. Rendered inside the expanded row.
export function RfqTimeline({
  projectId,
  rfqId,
  tracking,
  canManage,
}: {
  projectId: string;
  rfqId: string;
  tracking: RfqTrackView[];
  canManage: boolean;
}) {
  const t = useTranslations("track");
  const locale = useLocale();
  const [nudged, setNudged] = useState<Record<string, "ok" | "limit">>({});
  const [busy, setBusy] = useState<string | null>(null);

  if (tracking.length === 0) return null;

  const fmt = (iso: string | null) =>
    iso
      ? new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
          day: "numeric",
          month: "short",
        }).format(new Date(iso))
      : "";

  async function nudge(sellerOrgId: string) {
    if (busy) return;
    setBusy(sellerOrgId);
    try {
      const r = await nudgeSellerAction(projectId, rfqId, sellerOrgId);
      setNudged((prev) => ({
        ...prev,
        [sellerOrgId]: r.ok ? "ok" : "limit",
      }));
    } catch {
      // Leave the button available for a retry.
    } finally {
      setBusy(null);
    }
  }

  const Step = ({
    done,
    label,
    when,
    last,
    nextDone,
  }: {
    done: boolean;
    label: string;
    when: string;
    last?: boolean;
    nextDone?: boolean;
  }) => (
    <div className={cn("flex items-center", !last && "flex-1")}>
      <div className="flex min-w-[72px] flex-col items-center gap-1">
        <span
          className={cn(
            "flex h-[22px] w-[22px] items-center justify-center rounded-pill text-[11px] font-bold",
            done ? "bg-ok text-white" : "border-2 border-line-2 bg-surface text-transparent",
          )}
        >
          ✓
        </span>
        <span className={cn("text-[11px] font-semibold", done ? "text-ink" : "text-mut")}>
          {label}
        </span>
        <span className="font-mono text-[10px] text-mut">{when || "·"}</span>
      </div>
      {!last && (
        <span
          className={cn("mx-1 mb-[34px] h-[2px] flex-1", nextDone ? "bg-ok" : "bg-line-2")}
        />
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-2.5 border-t border-line px-4 py-3">
      <span className="font-mono text-[11px] uppercase tracking-[.08em] text-mut">
        {t("title")}
      </span>
      {tracking.map((rec) => {
        const quoted = rec.respondedAt != null;
        const opened = rec.openedAt != null || quoted;
        const state = nudged[rec.sellerOrgId];
        return (
          <div
            key={rec.sellerOrgId}
            className="rounded-card border border-line bg-surface p-3.5"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2.5">
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-line bg-canvas font-mono text-[10px] font-semibold text-mut">
                {rec.sellerName.slice(0, 2).toUpperCase()}
              </span>
              <span className="text-[13.5px] font-bold text-ink">{rec.sellerName}</span>
              <span
                className={cn(
                  "rounded-pill px-2.5 py-1 font-mono text-[11px] font-semibold",
                  quoted ? "bg-quoted-soft text-quoted" : "bg-warn-soft text-warn",
                )}
              >
                {quoted ? t("stQuoted") : opened ? t("stOpened") : t("stWaiting")}
              </span>
              {canManage && !quoted && (
                <span className="ml-auto">
                  {state === "ok" ? (
                    <span className="text-[12px] font-medium text-ok">✓ {t("nudged")}</span>
                  ) : state === "limit" ? (
                    <span className="text-[12px] text-mut">{t("nudgeLimit")}</span>
                  ) : (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void nudge(rec.sellerOrgId)}
                      className="rounded-pill border border-line-3 px-2.5 py-1 text-[12px] font-semibold text-ink transition hover:border-brand hover:text-brand disabled:opacity-50"
                    >
                      🔔 {t("nudge")}
                    </button>
                  )}
                </span>
              )}
            </div>
            <div className="flex items-start">
              <Step done label={t("sSent")} when={fmt(rec.sentAt)} nextDone={opened} />
              <Step done={opened} label={t("sOpened")} when={fmt(rec.openedAt)} nextDone={quoted} />
              <Step done={quoted} label={t("sQuoted")} when={fmt(rec.respondedAt)} last />
            </div>
          </div>
        );
      })}
    </div>
  );
}
