"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, Input } from "@/components/ui";
import { cn } from "@/lib/ui/cn";
import {
  isValidMapping,
  SPEC_FIELDS,
  type ColumnMapping,
  type SpecField,
} from "@/lib/import/parse";
import { createProjectFromImportAction } from "@/lib/import/actions";

interface ParseResponse {
  header: string[];
  rows: string[][];
  totalRows: number;
  mapping: ColumnMapping;
  savedApplied: boolean;
}

const FIELD_LABEL: Record<SpecField, string> = {
  code: "fCode",
  zone: "fZone",
  category: "fCategory",
  qty: "fQty",
  qtyUnit: "fQtyUnit",
};

export function ImportWizard() {
  const t = useTranslations("import");
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParseResponse | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [name, setName] = useState("");
  const [buildingType, setBuildingType] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function runParse(body: BodyInit, headers?: HeadersInit, fileName?: string) {
    setError(null);
    try {
      const res = await fetch("/api/import/parse", { method: "POST", body, headers });
      if (!res.ok) {
        // 422 = readable but nothing importable; anything else = unreadable file.
        setError(res.status === 422 ? "errEmpty" : "errParse");
        return;
      }
      const data: ParseResponse = await res.json();
      setParsed(data);
      setMapping(data.mapping);
      if (!name) setName(fileName?.replace(/\.[^.]+$/, "") ?? "");
    } catch {
      setError("errParse");
    }
  }

  function preview() {
    const file = fileRef.current?.files?.[0];
    startTransition(async () => {
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        await runParse(fd, undefined, file.name);
      } else if (text.trim()) {
        await runParse(JSON.stringify({ text }), { "Content-Type": "application/json" });
      } else {
        setError("errEmpty");
      }
    });
  }

  function setField(field: SpecField, value: string) {
    setMapping((prev) => {
      const next = { ...prev };
      if (value === "") delete next[field];
      else next[field] = Number(value);
      return next;
    });
  }

  function create() {
    if (!parsed) return;
    if (!isValidMapping(mapping)) return setError("errInvalidMapping");
    if (!name.trim()) return setError("errName");
    setError(null);
    startTransition(async () => {
      const r = await createProjectFromImportAction({
        name,
        buildingType,
        header: parsed.header,
        rows: parsed.rows,
        mapping,
      });
      if (r?.error) setError(`err${r.error === "name_required" ? "Name" : r.error === "invalid_mapping" ? "InvalidMapping" : "Empty"}`);
    });
  }

  const fieldByCol = new Map<number, SpecField>();
  for (const f of SPEC_FIELDS) if (mapping[f] !== undefined) fieldByCol.set(mapping[f]!, f);

  if (!parsed) {
    return (
      <Card className="gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">{t("uploadLabel")}</span>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.csv,text/csv"
            className="text-sm file:mr-3 file:rounded-pill file:border-0 file:bg-brand file:px-4 file:py-1.5 file:text-white"
          />
          <span className="text-xs text-mut">{t("uploadHint")}</span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">{t("orPaste")}</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder={t("pastePlaceholder")}
            className="rounded-sm border border-line-2 bg-surface px-3 py-2 font-mono text-xs outline-none focus:border-brand"
          />
        </label>

        {error && <p className="text-sm text-brand">{t(error)}</p>}
        <div>
          <Button onClick={preview} disabled={pending}>
            {pending ? t("parsing") : t("preview")}
          </Button>
        </div>
      </Card>
    );
  }

  const previewRows = parsed.rows.slice(0, 12);
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setParsed(null)}
        className="self-start text-sm text-sub hover:text-ink"
      >
        {t("changeFile")}
      </button>

      <Card className="gap-3">
        <div>
          <h2 className="font-semibold text-ink">{t("mapTitle")}</h2>
          <p className="text-xs text-mut">{t("mapHint")}</p>
          {parsed.savedApplied && (
            <p className="mt-1 text-xs font-medium text-ok">✓ {t("savedApplied")}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {SPEC_FIELDS.map((f) => (
            <label key={f} className="flex flex-col gap-1 text-xs font-medium text-ink">
              {t(FIELD_LABEL[f])}
              {f === "code" && <span className="text-brand"> *</span>}
              <select
                value={mapping[f] ?? ""}
                onChange={(e) => setField(f, e.target.value)}
                className="rounded-sm border border-line-2 bg-surface px-2 py-1.5 text-sm font-normal outline-none focus:border-brand"
              >
                <option value="">{t("colNone")}</option>
                {parsed.header.map((h, idx) => (
                  <option key={idx} value={idx}>
                    {h || `#${idx + 1}`}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </Card>

      <Card padded={false}>
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <span className="font-semibold text-ink">{t("previewTitle")}</span>
          <span className="text-xs text-mut">{t("rowsFound", { n: parsed.totalRows })}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line">
                {parsed.header.map((h, idx) => {
                  const f = fieldByCol.get(idx);
                  return (
                    <th key={idx} className={cn("px-3 py-2", f ? "text-brand" : "text-mut")}>
                      <div className="font-semibold">{h || `#${idx + 1}`}</div>
                      {f && <div className="text-[10px] font-normal">→ {t(FIELD_LABEL[f])}</div>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, r) => (
                <tr key={r} className="border-b border-line last:border-0">
                  {parsed.header.map((_, c) => (
                    <td
                      key={c}
                      className={cn("px-3 py-1.5", fieldByCol.has(c) ? "text-ink" : "text-sub")}
                    >
                      {row[c] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            {t("projectName")}
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("projectNamePlaceholder")}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            {t("buildingType")}
            <Input value={buildingType} onChange={(e) => setBuildingType(e.target.value)} />
          </label>
        </div>
        {error && <p className="text-sm text-brand">{t(error)}</p>}
        <div>
          <Button onClick={create} disabled={pending || !isValidMapping(mapping)}>
            {pending ? t("creating") : t("create")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
