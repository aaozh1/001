"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, Card } from "@/components/ui";
import { cn } from "@/lib/ui/cn";
import {
  type MaterialColumnMapping,
  type MaterialDraftRow,
  MATERIAL_FIELDS,
  gridToDrafts,
} from "@/lib/import/catalog-extract";

interface CategoryOpt {
  key: string;
  label: string;
}

type ParseResponse =
  | { kind: "candidates"; rows: (MaterialDraftRow & { confidence: number; source: string })[] }
  | {
      kind: "grid";
      header: string[];
      mapping: MaterialColumnMapping;
      rows: MaterialDraftRow[];
      needsMapping: boolean;
      raw?: string[][];
    };

interface ReviewRow extends MaterialDraftRow {
  category: string;
  confidence?: number;
  source?: string;
}

type Step = "source" | "mapping" | "review" | "done";

// นำเข้าสินค้าจากไฟล์ — 3 จังหวะ: เลือกแหล่ง → ตรวจ/แก้แถวที่ระบบเสนอ →
// บันทึกเป็นฉบับร่าง (ไม่มีอะไรเผยแพร่อัตโนมัติ)
export function ImportWizard({ categories }: { categories: CategoryOpt[] }) {
  const t = useTranslations("sellerImport");
  const [step, setStep] = useState<Step>("source");
  const [pasted, setPasted] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [globalCat, setGlobalCat] = useState(categories[0]?.key ?? "");
  const [fromPdf, setFromPdf] = useState(false);
  // Manual-mapping state (sheet whose name column wasn't recognised).
  const [rawGrid, setRawGrid] = useState<string[][]>([]);
  const [header, setHeader] = useState<string[]>([]);
  const [mapping, setMapping] = useState<MaterialColumnMapping>({});
  const [result, setResult] = useState<{ created: number; brandsCreated: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function errorLabel(code: string | undefined): string {
    if (code === "no_text") return t("errNoText");
    if (code === "no_products") return t("errNoProducts");
    if (code === "too_large") return t("errTooLarge");
    if (code === "rate_limited") return t("errRate");
    return t("errParse");
  }

  async function handleParse(body: FormData | { text: string }) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/seller/import/parse", {
        method: "POST",
        ...(body instanceof FormData
          ? { body }
          : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
      });
      if (res.status === 429) {
        setError(errorLabel("rate_limited"));
        return;
      }
      const data = (await res.json().catch(() => null)) as
        | ParseResponse
        | { error?: { code?: string } }
        | null;
      if (!res.ok || !data || !("kind" in data)) {
        setError(errorLabel((data as { error?: { code?: string } } | null)?.error?.code));
        return;
      }
      setFromPdf(data.kind === "candidates");
      if (data.kind === "grid" && data.needsMapping) {
        setRawGrid(data.raw ?? []);
        setHeader(data.header);
        setMapping(data.mapping);
        setStep("mapping");
        return;
      }
      startReview(data.rows);
    } catch {
      setError(errorLabel(undefined));
    } finally {
      setPending(false);
    }
  }

  function startReview(drafts: MaterialDraftRow[]) {
    setRows(drafts.map((d) => ({ ...d, category: globalCat })));
    setStep("review");
  }

  function applyMapping() {
    const drafts = gridToDrafts(rawGrid, mapping);
    if (drafts.length === 0) {
      setError(t("errNoProducts"));
      return;
    }
    setError(null);
    startReview(drafts);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.set("file", file);
    void handleParse(form);
    e.target.value = "";
  }

  function setRow(i: number, patch: Partial<ReviewRow>) {
    setRows((prev) => prev.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  }
  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, k) => k !== i));
  }
  function applyGlobalCat(key: string) {
    setGlobalCat(key);
    setRows((prev) => prev.map((r) => ({ ...r, category: key })));
  }

  async function createDrafts() {
    const clean = rows
      .filter((r) => r.nameTh.trim())
      .map((r) => ({
        nameTh: r.nameTh,
        nameEn: r.nameEn,
        brand: r.brand,
        model: r.model,
        sku: r.sku,
        category: r.category,
        price: r.price.trim() === "" ? "" : Number(r.price),
        unit: r.unit,
        size: r.size,
        color: r.color,
        cert: r.cert,
        leadTime: r.leadTime,
        warranty: r.warranty,
        note: r.note,
      }));
    if (clean.length === 0) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/seller/import/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: clean }),
      });
      const data = (await res.json().catch(() => null)) as
        | { created: number; brandsCreated: number }
        | null;
      if (!res.ok || !data) {
        setError(t("errCreate"));
        return;
      }
      setResult(data);
      setStep("done");
    } catch {
      setError(t("errCreate"));
    } finally {
      setPending(false);
    }
  }

  const cell =
    "w-full rounded-sm border border-line-2 bg-surface px-2 py-1 text-[16.25px] outline-none focus:border-brand";

  // ── Step: source ─────────────────────────────────────────────────────
  if (step === "source") {
    return (
      <div className="flex flex-col gap-4">
        <Card>
          <h2 className="font-semibold text-ink">📄 {t("uploadTitle")}</h2>
          <p className="mt-1 text-sm text-sub">{t("uploadHint")}</p>
          <div className="mt-3">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.csv,.tsv,.txt,.pdf"
              onChange={onFile}
              className="hidden"
              aria-label={t("uploadTitle")}
            />
            <Button onClick={() => fileRef.current?.click()} disabled={pending}>
              {pending ? t("parsing") : t("chooseFile")}
            </Button>
          </div>
          <p className="mt-2 text-xs text-mut">{t("pdfNote")}</p>
        </Card>

        <Card>
          <h2 className="font-semibold text-ink">📋 {t("pasteTitle")}</h2>
          <p className="mt-1 text-sm text-sub">{t("pasteHint")}</p>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={7}
            placeholder={t("pastePh")}
            className="mt-3 w-full rounded-sm border border-line-2 bg-surface px-3 py-2 font-mono text-xs outline-none focus:border-brand"
          />
          <div className="mt-2">
            <Button
              variant="ghost"
              disabled={pending || !pasted.trim()}
              onClick={() => void handleParse({ text: pasted })}
            >
              {pending ? t("parsing") : t("parsePaste")}
            </Button>
          </div>
        </Card>

        {error && (
          <p className="text-sm text-warn" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  // ── Step: manual column mapping ──────────────────────────────────────
  if (step === "mapping") {
    return (
      <Card>
        <h2 className="font-semibold text-ink">{t("mappingTitle")}</h2>
        <p className="mt-1 text-sm text-sub">{t("mappingHint")}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {MATERIAL_FIELDS.map((f) => (
            <label key={f} className="flex items-center justify-between gap-3 text-sm text-ink">
              {t(`f_${f}`)}
              <select
                value={mapping[f] ?? ""}
                onChange={(e) =>
                  setMapping((m) => ({
                    ...m,
                    [f]: e.target.value === "" ? undefined : Number(e.target.value),
                  }))
                }
                className="rounded-sm border border-line-2 bg-surface px-2 py-1 text-sm outline-none focus:border-brand"
              >
                <option value="">—</option>
                {header.map((h, i) => (
                  <option key={i} value={i}>
                    {h || `(${i + 1})`}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        {error && (
          <p className="mt-3 text-sm text-warn" role="alert">
            {error}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setStep("source")}>
            {t("backStep")}
          </Button>
          <Button disabled={mapping.nameTh === undefined} onClick={applyMapping}>
            {t("continue")}
          </Button>
        </div>
      </Card>
    );
  }

  // ── Step: done ───────────────────────────────────────────────────────
  if (step === "done" && result) {
    return (
      <Card className="items-start gap-3">
        <Badge variant="ok">✓ {t("doneBadge")}</Badge>
        <p className="text-ink">
          {t("doneText", { created: result.created, brands: result.brandsCreated })}
        </p>
        <p className="text-sm text-sub">{t("doneHint")}</p>
        <div className="flex gap-3">
          <Link
            href="/seller/materials"
            className="rounded-pill bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            {t("goReview")} →
          </Link>
          <Button
            variant="ghost"
            onClick={() => {
              setRows([]);
              setResult(null);
              setPasted("");
              setStep("source");
            }}
          >
            {t("importMore")}
          </Button>
        </div>
      </Card>
    );
  }

  // ── Step: review ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">
      <Card className="flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">
            {t("reviewTitle", { n: rows.length })}
            {fromPdf && <Badge variant="info" className="ml-2">PDF · {t("autoExtracted")}</Badge>}
          </h2>
          <p className="text-xs text-mut">{t("reviewHint")}</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          {t("globalCategory")}
          <select
            value={globalCat}
            onChange={(e) => applyGlobalCat(e.target.value)}
            className="rounded-sm border border-line-2 bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand"
          >
            {categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </Card>

      <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-soft">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-mut">
              <th className="px-2 py-2 font-semibold">{t("f_nameTh")} *</th>
              <th className="px-2 py-2 font-semibold">{t("colCategory")}</th>
              <th className="px-2 py-2 font-semibold">{t("f_brand")}</th>
              <th className="px-2 py-2 font-semibold">{t("f_model")}</th>
              <th className="px-2 py-2 font-semibold">{t("f_price")}</th>
              <th className="px-2 py-2 font-semibold">{t("f_unit")}</th>
              <th className="px-2 py-2 font-semibold">{t("f_size")}</th>
              <th className="px-2 py-2 font-semibold">{t("f_cert")}</th>
              <th className="px-2 py-2 font-semibold">{t("f_leadTime")}</th>
              {fromPdf && <th className="px-2 py-2 font-semibold">{t("confidence")}</th>}
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-line last:border-0 align-top">
                <td className="min-w-44 px-2 py-1.5">
                  <input value={r.nameTh} onChange={(e) => setRow(i, { nameTh: e.target.value })} className={cell} aria-label={t("f_nameTh")} />
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={r.category}
                    onChange={(e) => setRow(i, { category: e.target.value })}
                    className={cn(cell, "min-w-32")}
                    aria-label={t("colCategory")}
                  >
                    {categories.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <input value={r.brand} onChange={(e) => setRow(i, { brand: e.target.value })} className={cn(cell, "w-28")} aria-label={t("f_brand")} />
                </td>
                <td className="px-2 py-1.5">
                  <input value={r.model} onChange={(e) => setRow(i, { model: e.target.value })} className={cn(cell, "w-28")} aria-label={t("f_model")} />
                </td>
                <td className="px-2 py-1.5">
                  <input value={r.price} onChange={(e) => setRow(i, { price: e.target.value })} inputMode="decimal" className={cn(cell, "w-20")} aria-label={t("f_price")} />
                </td>
                <td className="px-2 py-1.5">
                  <input value={r.unit} onChange={(e) => setRow(i, { unit: e.target.value })} className={cn(cell, "w-20")} aria-label={t("f_unit")} />
                </td>
                <td className="px-2 py-1.5">
                  <input value={r.size} onChange={(e) => setRow(i, { size: e.target.value })} className={cn(cell, "w-24")} aria-label={t("f_size")} />
                </td>
                <td className="px-2 py-1.5">
                  <input value={r.cert} onChange={(e) => setRow(i, { cert: e.target.value })} className={cn(cell, "w-24")} aria-label={t("f_cert")} />
                </td>
                <td className="px-2 py-1.5">
                  <input value={r.leadTime} onChange={(e) => setRow(i, { leadTime: e.target.value })} className={cn(cell, "w-20")} aria-label={t("f_leadTime")} />
                </td>
                {fromPdf && (
                  <td className="px-2 py-2 text-xs text-mut" title={r.source}>
                    {r.confidence != null ? `${r.confidence}%` : "—"}
                  </td>
                )}
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    aria-label={t("removeRow")}
                    className="rounded px-1.5 py-0.5 text-mut hover:text-brand"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <p className="text-sm text-warn" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => setStep("source")}>
          {t("backStep")}
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-mut">🔒 {t("draftNote")}</span>
          <Button disabled={pending || rows.length === 0} onClick={() => void createDrafts()}>
            {pending ? t("creating") : t("createDrafts", { n: rows.length })}
          </Button>
        </div>
      </div>
    </div>
  );
}
