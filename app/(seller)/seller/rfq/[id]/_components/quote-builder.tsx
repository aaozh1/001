"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Input } from "@/components/ui";
import { submitQuoteAction } from "@/lib/quote/actions";

export interface ExistingQuote {
  pricePerUnit: string;
  projectDiscount: string | null;
  leadTime: string | null;
  paymentTerms: string | null;
  validUntil: string | null;
  includeSample: boolean;
}

export function QuoteBuilder({
  rfqId,
  existing,
}: {
  rfqId: string;
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
  const [includeSample, setSample] = useState(existing?.includeSample ?? false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await submitQuoteAction(rfqId, {
        pricePerUnit,
        projectDiscount: projectDiscount || null,
        leadTime: leadTime || null,
        paymentTerms: paymentTerms || null,
        validUntil: validUntil ? new Date(`${validUntil}T23:59:59`).toISOString() : null,
        includeSample,
      });
      if (r.ok) setDone(true);
      else setError(r.error ?? "error");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          {t("pricePerUnit")} <span className="text-brand">*</span>
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            value={pricePerUnit}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
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
          {t("leadTime")}
          <Input value={leadTime} onChange={(e) => setLead(e.target.value)} placeholder={t("leadPlaceholder")} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          {t("validUntil")}
          <Input type="date" value={validUntil} onChange={(e) => setValid(e.target.value)} />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        {t("paymentTerms")}
        <Input value={paymentTerms} onChange={(e) => setTerms(e.target.value)} placeholder={t("paymentPlaceholder")} />
      </label>

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

      <div>
        <Button onClick={submit} disabled={pending || !pricePerUnit}>
          {pending ? t("submitting") : existing ? t("updateQuote") : t("submit")}
        </Button>
      </div>
    </div>
  );
}
