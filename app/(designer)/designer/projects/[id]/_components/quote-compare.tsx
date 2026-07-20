"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Modal } from "@/components/ui";
import { cn } from "@/lib/ui/cn";
import { effectiveUnitPrice } from "@/lib/quote/logic";
import { selectQuoteAction } from "@/lib/quote/select-actions";
import type { RfqItemQuote } from "./rfq-send-panel";

export function QuoteCompareButton({
  projectId,
  rfqId,
  rfqStatus,
  quotes,
}: {
  projectId: string;
  rfqId: string;
  rfqStatus: string;
  quotes: RfqItemQuote[];
}) {
  const t = useTranslations("rfq");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const closed = rfqStatus === "closed_won";

  function choose(quoteId: string) {
    startTransition(async () => {
      await selectQuoteAction(projectId, rfqId, quoteId);
      setOpen(false);
    });
  }

  const money = (v: string) => `฿${Number(v).toLocaleString()}`;

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {t("compareOpen")}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("compareTitle")} wide>
        {closed && (
          <p className="mb-2 text-sm font-medium text-ok">✓ {t("closedWon")}</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-mut">
                <th className="px-3 py-2 font-semibold">{t("colSeller")}</th>
                <th className="px-3 py-2 font-semibold">{t("colPrice")}</th>
                <th className="px-3 py-2 font-semibold">{t("colEffective")}</th>
                <th className="px-3 py-2 font-semibold">{t("colLead")}</th>
                <th className="px-3 py-2 font-semibold">{t("colValid")}</th>
                <th className="px-3 py-2 font-semibold">{t("colSample")}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => {
                const eff = effectiveUnitPrice(
                  Number(q.pricePerUnit),
                  q.projectDiscount ? Number(q.projectDiscount) : null,
                );
                const won = q.status === "selected";
                return (
                  <tr
                    key={q.quoteId}
                    className={cn(
                      "border-b border-line last:border-0",
                      won && "bg-ok-soft",
                    )}
                  >
                    <td className="px-3 py-2 font-medium text-ink">{q.sellerName}</td>
                    <td className="px-3 py-2 text-sub">{money(q.pricePerUnit)}</td>
                    <td className="px-3 py-2 font-semibold text-ok">
                      {money(String(eff))}
                    </td>
                    <td className="px-3 py-2 text-sub">{q.leadTime ?? "—"}</td>
                    <td className="px-3 py-2 text-sub">
                      {q.validUntil ? q.validUntil.slice(0, 10) : "—"}
                    </td>
                    <td className="px-3 py-2 text-sub">
                      {q.includeSample ? t("yes") : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {won ? (
                        <span className="text-xs font-semibold text-ok">{t("won")}</span>
                      ) : closed ? null : (
                        <Button size="sm" disabled={pending} onClick={() => choose(q.quoteId)}>
                          {pending ? t("selecting") : t("choose")}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Modal>
    </>
  );
}
