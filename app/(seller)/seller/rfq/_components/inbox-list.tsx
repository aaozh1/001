"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge, Card, Chip, buttonClasses } from "@/components/ui";
import { submitQuoteAction } from "@/lib/quote/actions";
import {
  INBOX_TABS,
  type InboxTab,
  countByTab,
  matchesTab,
} from "@/lib/quote/inbox-tabs";
import { SlaCountdown } from "@/app/_components/sla-countdown";

export interface InboxRow {
  id: string;
  projectName: string;
  materials: string;
  qtyLabel: string;
  slaDueAt: string | null;
  slaDateLabel: string;
  status: string;
  responded: boolean;
  quoteStatus: string | null;
  wantSample: boolean;
}

// Tabbed RFQ inbox (ROADMAP 3.3): all / awaiting / answered / won / lost, with
// a live SLA countdown on every awaiting lead.
export function InboxList({ rows }: { rows: InboxRow[] }) {
  const t = useTranslations("sellerRfq");
  const router = useRouter();
  const [tab, setTab] = useState<InboxTab>("all");
  const [quick, setQuick] = useState<Record<string, string>>({});
  const [quickBusy, setQuickBusy] = useState<string | null>(null);
  const [quickError, setQuickError] = useState<string | null>(null);

  const counts = useMemo(() => countByTab(rows), [rows]);
  const visible = rows.filter((r) => matchesTab(r, tab));

  // 3G quick quote: price-only reply straight from the inbox row. Full terms
  // (lead time, validity, attachments) still live in the composer.
  async function sendQuick(rfqId: string) {
    const price = (quick[rfqId] ?? "").trim();
    if (!price || quickBusy) return;
    setQuickBusy(rfqId);
    setQuickError(null);
    try {
      const r = await submitQuoteAction(rfqId, { pricePerUnit: price });
      if (r.ok) {
        setQuick((prev) => ({ ...prev, [rfqId]: "" }));
        router.refresh();
      } else {
        setQuickError(rfqId);
      }
    } catch {
      setQuickError(rfqId);
    } finally {
      setQuickBusy(null);
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        {INBOX_TABS.map((key) => (
          <Chip key={key} active={tab === key} onClick={() => setTab(key)}>
            {t(`tab.${key}`)} {counts[key] > 0 ? `(${counts[key]})` : ""}
          </Chip>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-2 bg-surface p-10 text-center text-sub">
          {t("emptyTab")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {/* 3G privacy footnote renders after the list (see below) */}
          {visible.map((r) => (
            <Card key={r.id} className="gap-2.5">
              {/* 3G row: material title bold, project/qty meta, SLA chip */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[18.75px] font-bold text-ink">
                      {r.materials || r.projectName}
                    </span>
                    {r.quoteStatus === "selected" ? (
                      <Badge variant="ok">{t("won")}</Badge>
                    ) : r.quoteStatus === "rejected" ? (
                      <Badge variant="neutral">{t("lost")}</Badge>
                    ) : r.responded ? (
                      <Badge variant="ok">✓ {t("responded")}</Badge>
                    ) : null}
                  </div>
                  <div className="mt-1 truncate text-sm text-sub">
                    {r.projectName}
                    {r.qtyLabel ? ` · ${r.qtyLabel}` : ""}
                    {r.wantSample ? ` · ${t("wantSample")}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!r.responded && (r.status === "open" || r.status === "quoted") && (
                    <span className="rounded-pill bg-warn-soft px-2.5 py-1 font-mono text-[13.75px] font-semibold text-warn">
                      <SlaCountdown slaDueAt={r.slaDueAt} />
                    </span>
                  )}
                </div>
              </div>
              {/* 3G quick-quote row: inline price input for unanswered leads */}
              {!r.responded && (r.status === "open" || r.status === "quoted") && (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={quick[r.id] ?? ""}
                    onChange={(e) => setQuick((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void sendQuick(r.id);
                    }}
                    placeholder={t("quickPlaceholder")}
                    className="min-w-0 flex-1 rounded-sm border border-line-2 bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
                  />
                  <button
                    type="button"
                    disabled={quickBusy === r.id || !(quick[r.id] ?? "").trim()}
                    onClick={() => void sendQuick(r.id)}
                    className="rounded-sm bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-deep disabled:opacity-40"
                  >
                    {quickBusy === r.id ? t("submitting") : t("quickSend")}
                  </button>
                </div>
              )}
              {quickError === r.id && (
                <p className="text-xs text-warn" role="alert">
                  {t("errFailed")}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-mono text-[13.75px] text-mut">
                  {r.slaDateLabel ? `${t("sla")}: ${r.slaDateLabel}` : ""}
                </span>
                <span className="flex gap-2">
                  <Link
                    href="/seller/chat"
                    className={buttonClasses({ size: "sm", variant: "ghost" })}
                  >
                    {t("chatBtn")}
                  </Link>
                  <Link href={`/seller/rfq/${r.id}`} className={buttonClasses({ size: "sm" })}>
                    {r.responded ? t("open") : t("respondFull")}
                  </Link>
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
