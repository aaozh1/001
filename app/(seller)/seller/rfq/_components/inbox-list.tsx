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
          {visible.map((r) => (
            <Card key={r.id} className="flex-row items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink">{r.projectName}</span>
                  {r.quoteStatus === "selected" ? (
                    <Badge variant="ok">{t("won")}</Badge>
                  ) : r.quoteStatus === "rejected" ? (
                    <Badge variant="neutral">{t("lost")}</Badge>
                  ) : r.responded ? (
                    <Badge variant="ok">✓ {t("responded")}</Badge>
                  ) : null}
                  {r.wantSample && <Badge variant="brand">{t("wantSample")}</Badge>}
                </div>
                <div className="mt-1 truncate text-sm text-sub">
                  {r.materials}
                  {r.qtyLabel ? ` · ${r.qtyLabel}` : ""}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-3 text-xs">
                  {!r.responded &&
                    (r.status === "open" || r.status === "quoted") && (
                      <SlaCountdown slaDueAt={r.slaDueAt} />
                    )}
                  {r.slaDateLabel && (
                    <span className="text-mut">
                      {t("sla")}: {r.slaDateLabel}
                    </span>
                  )}
                </div>
              </div>
              <Link href={`/seller/rfq/${r.id}`} className={buttonClasses({ size: "sm" })}>
                {r.responded ? t("open") : t("respond")}
              </Link>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
