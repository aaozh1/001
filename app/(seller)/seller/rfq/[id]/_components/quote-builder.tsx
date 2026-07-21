"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Input } from "@/components/ui";
import { computeQuoteSummary, formatBaht } from "@/lib/quote/composer";
import { submitQuoteAction } from "@/lib/quote/actions";

export interface ExistingQuote {
  pricePerUnit: string;
  projectDiscount: string | null;
  leadTime: string | null;
  paymentTerms: string | null;
  validUntil: string | null;
  specsheetUrl: string | null;
  includeSample: boolean;
}

function num(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// 5H quote composer — the seller sees the deal the way the designer will:
// list price as the base row, THIS RFQ's quantity highlighted with the offered
// unit price, and the line total + % vs list computed live.
export function QuoteBuilder({
  rfqId,
  qty,
  qtyUnit,
  listPrice,
  existing,
}: {
  rfqId: string;
  qty: string | null;
  qtyUnit: string | null;
  listPrice: string | null;
  existing: ExistingQuote | null;
}) {
  const t = useTranslations("sellerRfq");
  const [pricePerUnit, setPrice] = useState(existing?.pricePerUnit ?? "");
  const [projectDiscount, setDiscount] = useState(existing?.projectDiscount ?? "");
  const [leadTime, setLead] = useState(existing?.leadTime ?? "");
  const [paymentTerms, setTerms] = useState(existing?.paymentTerms ?? "");
  const [validUntil, setValid] = useState(
    existing?.validUntil ? existing.validUntil.slice(0, 10) : "",
  );
  const [specsheetUrl, setSpecsheet] = useState(existing?.specsheetUrl ?? "");
  const [attachOpen, setAttachOpen] = useState(Boolean(existing?.specsheetUrl));
  const [includeSample, setSample] = useState(existing?.includeSample ?? false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const summary = useMemo(
    () =>
      computeQuoteSummary({
        qty: num(qty ?? ""),
        unitPrice: num(pricePerUnit),
        listPrice: num(listPrice ?? ""),
      }),
    [qty, pricePerUnit, listPrice],
  );

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await submitQuoteAction(rfqId, {
        pricePerUnit,
        projectDiscount: projectDiscount || null,
        leadTime: leadTime || null,
        paymentTerms: paymentTerms || null,
        validUntil: validUntil ? new Date(`${validUntil}T23:59:59`).toISOString() : null,
        specsheetUrl: specsheetUrl.trim() || null,
        includeSample,
      });
      if (r.ok) setDone(true);
      else setError(r.error ?? "error");
    });
  }

  const qtyLabel = qty ? `${qty} ${qtyUnit ?? ""}`.trim() : null;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Tier table: list price base row + this-RFQ row with live math ── */}
      <div className="overflow-hidden rounded-card border border-line">
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 border-b border-line bg-canvas px-3.5 py-2 font-mono text-[10.5px] uppercase tracking-[.05em] text-mut">
          <span>{t("tierHead")}</span>
          <span className="text-right">{t("unitPriceHead")}</span>
          <span className="w-24 text-right sm:w-28">{t("lineTotalHead")}</span>
          <span className="w-10" />
        </div>

        {listPrice && (
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 border-b border-line px-3.5 py-2.5 text-sm">
            <span className="text-sub">{t("listPriceRow")}</span>
            <span className="text-right font-mono text-mut">{formatBaht(Number(listPrice))}</span>
            <span className="w-24 text-right font-mono text-mut sm:w-28">—</span>
            <span className="w-10" />
          </div>
        )}

        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 bg-brand-soft/50 px-3.5 py-2.5 text-sm">
          <span className="font-semibold text-ink">
            {qtyLabel ? t("thisRfqQty", { qty: qtyLabel }) : t("thisRfq")}
          </span>
          <span className="text-right">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              value={pricePerUnit}
              onChange={(e) => setPrice(e.target.value)}
              aria-label={t("pricePerUnit")}
              className="w-28 rounded-sm border-2 border-brand bg-surface px-2.5 py-1.5 text-right font-mono text-sm font-semibold text-ink outline-none focus:border-brand-deep"
            />
          </span>
          <span className="w-24 text-right font-mono font-bold text-brand-deep sm:w-28">
            {summary.lineTotal != null ? formatBaht(summary.lineTotal) : "—"}
          </span>
          <span className="w-10 pl-1 font-mono text-[11px] text-ok">
            {summary.discountPct != null && summary.discountPct !== 0
              ? `${summary.discountPct > 0 ? "+" : "−"}${Math.abs(summary.discountPct)}%`
              : ""}
          </span>
        </div>
      </div>

      {/* ── Terms row: lead time + validity, mock's twin boxes ── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center justify-between gap-3 rounded-card border border-line px-4 py-3">
          <span className="text-sm font-semibold text-ink">{t("leadTime")}</span>
          <Input
            value={leadTime}
            onChange={(e) => setLead(e.target.value)}
            placeholder={t("leadPlaceholder")}
            className="w-32 text-right font-mono"
          />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-card border border-line px-4 py-3">
          <span className="text-sm font-semibold text-ink">{t("validUntil")}</span>
          <Input
            type="date"
            value={validUntil}
            onChange={(e) => setValid(e.target.value)}
            className="w-40 font-mono"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          {t("projectDiscount")}
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            value={projectDiscount}
            onChange={(e) => setDiscount(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          {t("paymentTerms")}
          <Input
            value={paymentTerms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder={t("paymentPlaceholder")}
          />
        </label>
      </div>

      {/* ── Attachment: spec sheet / install guide link ── */}
      <div className="rounded-card border border-dashed border-line-3 px-4 py-3">
        {attachOpen ? (
          <label className="flex items-center gap-2.5 text-sm">
            <span aria-hidden>📄</span>
            <Input
              type="url"
              value={specsheetUrl}
              onChange={(e) => setSpecsheet(e.target.value)}
              placeholder={t("attachPlaceholder")}
              className="flex-1"
            />
          </label>
        ) : (
          <button
            type="button"
            onClick={() => setAttachOpen(true)}
            className="flex items-center gap-2.5 text-sm text-sub hover:text-brand"
          >
            <span aria-hidden>📄</span>
            {t("attachAdd")}
          </button>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={includeSample}
          onChange={(e) => setSample(e.target.checked)}
          className="h-4 w-4 accent-brand"
        />
        {t("includeSample")}
      </label>

      {done && <p className="text-sm font-medium text-ok">{t("submitted")}</p>}
      {error && (
        <p className="text-sm text-warn" role="alert">
          {error === "closed"
            ? t("errClosed")
            : error === "invalid"
              ? t("errInvalid")
              : t("errFailed")}
        </p>
      )}

      {/* ── Footer: neutrality note (rule #2) + submit ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <span className="font-mono text-[11.5px] text-mut">{t("neutrality")}</span>
        <Button onClick={submit} disabled={pending || !pricePerUnit}>
          {pending ? t("submitting") : existing ? t("updateQuote") : t("submit")}
        </Button>
      </div>
    </div>
  );
}
