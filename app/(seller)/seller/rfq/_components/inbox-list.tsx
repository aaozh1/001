"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Card, Chip, buttonClasses } from "@/components/ui";
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
  const [tab, setTab] = useState<InboxTab>("all");

  const counts = useMemo(() => countByTab(rows), [rows]);
  const visible = rows.filter((r) => matchesTab(r, tab));

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
                    <span className="truncate text-[15px] font-bold text-ink">
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
                    <span className="rounded-pill bg-warn-soft px-2.5 py-1 font-mono text-[11px] font-semibold text-warn">
                      <SlaCountdown slaDueAt={r.slaDueAt} />
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-mono text-[11px] text-mut">
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
                    {r.responded ? t("open") : t("respond")}
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
