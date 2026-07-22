"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/ui/cn";
import { categoryLabel } from "@/lib/materials/categories";
import { MaterialVisual } from "@/app/_components/material-visual";
import type { MaterialSummary } from "@/lib/materials/service";
import { MaterialCard } from "@/app/(designer)/designer/catalog/_components/material-card";
import { AddToProjectButton } from "@/app/(designer)/designer/catalog/_components/add-to-project-button";
import { CompareBar, CompareModal, COMPARE_MAX } from "@/app/_components/catalog-compare";

// Display modes for catalog results (สลับด้วยปุ่มไอคอนมุมขวาบน) — persisted in
// localStorage so the choice sticks across pages/visits.
const VIEWS = ["gridCompact", "grid", "listCompact", "list", "table"] as const;
type CatalogView = (typeof VIEWS)[number];
const VIEW_ICON: Record<CatalogView, string> = {
  gridCompact: "▦",
  grid: "⊞",
  listCompact: "☰",
  list: "≡",
  table: "▤",
};

// Optional table columns (name is always shown). Add/remove for quick compare.
const TABLE_COLS = [
  "brand",
  "model",
  "sku",
  "category",
  "price",
  "leadTime",
  "cert",
  "warranty",
  "moq",
  "size",
  "color",
] as const;
type TableCol = (typeof TABLE_COLS)[number];
const DEFAULT_COLS: TableCol[] = ["brand", "model", "price", "leadTime", "cert"];

const VIEW_KEY = "matlist.catalog.view";
const COLS_KEY = "matlist.catalog.cols";

export function CatalogResults({
  materials,
  locale,
  addFallbackHref,
  basePath,
}: {
  materials: MaterialSummary[];
  locale: string;
  /** undefined when the viewer can add directly; a URL otherwise, so the
   *  "+ Add" button always renders the same regardless of sign-in state. */
  addFallbackHref?: string;
  basePath: string;
}) {
  const t = useTranslations("catalog");
  const [view, setView] = useState<CatalogView>("grid");
  const [cols, setCols] = useState<TableCol[]>(DEFAULT_COLS);
  const [colsOpen, setColsOpen] = useState(false);
  const colsRef = useRef<HTMLDivElement>(null);

  // Compare selection — user-picked materials lined up side-by-side. Order is
  // the pick order (no ranking); capped at COMPARE_MAX columns.
  const [compare, setCompare] = useState<MaterialSummary[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const compareIds = new Set(compare.map((m) => m.id));

  function toggleCompare(m: MaterialSummary) {
    setCompare((prev) => {
      if (prev.some((x) => x.id === m.id)) return prev.filter((x) => x.id !== m.id);
      if (prev.length >= COMPARE_MAX) return prev;
      return [...prev, m];
    });
  }
  function removeCompare(id: string) {
    setCompare((prev) => prev.filter((x) => x.id !== id));
  }
  function clearCompare() {
    setCompare([]);
    setCompareOpen(false);
  }

  // Restore persisted display preferences after mount (SSR-safe).
  useEffect(() => {
    const v = window.localStorage.getItem(VIEW_KEY);
    if (VIEWS.includes(v as CatalogView)) setView(v as CatalogView);
    try {
      const raw = window.localStorage.getItem(COLS_KEY);
      if (raw) {
        const saved = (JSON.parse(raw) as string[]).filter((c): c is TableCol =>
          TABLE_COLS.includes(c as TableCol),
        );
        if (saved.length > 0) setCols(saved);
      }
    } catch {
      // Corrupt saved prefs — fall back to defaults.
    }
  }, []);

  useEffect(() => {
    if (!colsOpen) return;
    function onDown(e: MouseEvent) {
      if (!colsRef.current?.contains(e.target as Node)) setColsOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [colsOpen]);

  function pickView(v: CatalogView) {
    setView(v);
    window.localStorage.setItem(VIEW_KEY, v);
  }
  function toggleCol(c: TableCol) {
    setCols((prev) => {
      const next = prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c];
      window.localStorage.setItem(COLS_KEY, JSON.stringify(next));
      return next;
    });
  }

  const name = (m: MaterialSummary) =>
    locale === "en" && m.nameEn ? m.nameEn : m.nameTh;
  const spec = (m: MaterialSummary) =>
    locale === "en" && m.specEn ? m.specEn : m.specTh;
  const priceText = (m: MaterialSummary) =>
    m.price ? `฿${m.price}${m.unit ? `/${m.unit}` : ""}` : "—";

  return (
    <div>
      {/* View switcher — small icon buttons, top-right of the results. */}
      <div className="mb-3 flex items-center justify-end gap-2">
        {view === "table" && (
          <div ref={colsRef} className="relative">
            <button
              type="button"
              onClick={() => setColsOpen((v) => !v)}
              aria-expanded={colsOpen}
              className="rounded-pill border border-line-2 px-2.5 py-1 text-xs text-sub hover:border-brand hover:text-brand"
            >
              ⚙ {t("columns")} · {cols.length + 1}
            </button>
            {colsOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-card border border-line bg-surface p-2 shadow-lifted">
                <p className="px-2 py-1 text-xs text-mut">{t("columnsHint")}</p>
                {TABLE_COLS.map((c) => (
                  <label
                    key={c}
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-sm text-ink hover:bg-canvas"
                  >
                    <input
                      type="checkbox"
                      checked={cols.includes(c)}
                      onChange={() => toggleCol(c)}
                      className="h-4 w-4 accent-brand"
                    />
                    {t(`col_${c}`)}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
        <div
          role="group"
          aria-label={t("viewMode")}
          className="inline-flex rounded-pill border border-line-2 bg-canvas p-0.5"
        >
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => pickView(v)}
              aria-pressed={view === v}
              title={t(`view_${v}`)}
              aria-label={t(`view_${v}`)}
              className={cn(
                "rounded-pill px-2.5 py-1 text-sm leading-none transition-colors",
                view === v ? "bg-brand text-white" : "text-sub hover:text-ink",
              )}
            >
              {VIEW_ICON[v]}
            </button>
          ))}
        </div>
      </div>

      {view === "grid" && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {materials.map((m) => (
            <MaterialCard
              key={m.id}
              m={m}
              locale={locale}
              addFallbackHref={addFallbackHref}
              basePath={basePath}
              compareSelected={compareIds.has(m.id)}
              compareDisabled={compare.length >= COMPARE_MAX}
              onToggleCompare={() => toggleCompare(m)}
            />
          ))}
        </div>
      )}

      {view === "gridCompact" && (
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
          {materials.map((m) => (
            <Link
              key={m.id}
              href={`${basePath}/${m.id}`}
              className={cn(
                "group relative overflow-hidden rounded-card border border-line bg-surface shadow-soft transition hover:-translate-y-0.5 hover:border-brand",
                compareIds.has(m.id) && "ring-2 ring-brand",
              )}
            >
              <MaterialVisual
                image={m.image}
                swatchHex={m.swatchHex}
                category={m.category}
                alt={name(m)}
                className="h-20 rounded-none"
              />
              <button
                type="button"
                role="checkbox"
                aria-checked={compareIds.has(m.id)}
                aria-label={t("compareAdd")}
                title={
                  compare.length >= COMPARE_MAX && !compareIds.has(m.id)
                    ? t("compareMax")
                    : t("compareAdd")
                }
                disabled={compare.length >= COMPARE_MAX && !compareIds.has(m.id)}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleCompare(m);
                }}
                className={cn(
                  "absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-[5px] border text-[11px] font-bold shadow-soft transition",
                  compareIds.has(m.id)
                    ? "border-brand bg-brand text-white opacity-100"
                    : "border-line-2 bg-white/92 text-transparent opacity-0 hover:border-brand focus-visible:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-0",
                )}
              >
                ✓
              </button>
              <div className="p-2">
                <div className="truncate text-xs font-semibold text-ink group-hover:text-brand">
                  {name(m)}
                </div>
                <div className="truncate text-[13.75px] text-mut">
                  {[m.brand, m.model].filter(Boolean).join(" · ") || "—"}
                </div>
                <div className="mt-0.5 text-xs font-bold text-brand">{priceText(m)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {(view === "list" || view === "listCompact") && (
        <div className="divide-y divide-line rounded-card border border-line bg-surface shadow-soft">
          {materials.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex items-center gap-3 px-3",
                view === "list" ? "py-3" : "py-1.5",
              )}
            >
              <Link href={`${basePath}/${m.id}`} className="shrink-0">
                <MaterialVisual
                  image={m.image}
                  swatchHex={m.swatchHex}
                  category={m.category}
                  alt={name(m)}
                  className={cn("rounded-sm", view === "list" ? "h-14 w-14" : "h-8 w-8")}
                />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <Link
                    href={`${basePath}/${m.id}`}
                    className={cn(
                      "truncate font-semibold text-ink hover:text-brand",
                      view === "list" ? "text-sm" : "text-[16.25px]",
                    )}
                  >
                    {name(m)}
                  </Link>
                  <span className="truncate text-xs text-sub">
                    {[m.brand, m.model].filter(Boolean).join(" · ")}
                  </span>
                </div>
                {view === "list" && spec(m) && (
                  <div className="mt-0.5 truncate text-xs text-mut">{spec(m)}</div>
                )}
              </div>
              {view === "list" && (
                <span className="hidden shrink-0 text-xs text-mut sm:inline">
                  {m.leadTime ? `⏱ ${m.leadTime}` : ""}
                </span>
              )}
              <span className="shrink-0 text-sm font-bold text-brand">{priceText(m)}</span>
              <span className="shrink-0">
                <AddToProjectButton materialId={m.id} fallbackHref={addFallbackHref} />
              </span>
            </div>
          ))}
        </div>
      )}

      {view === "table" && (
        <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-soft">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-mut">
                <th className="px-3 py-2 font-semibold">{t("col_name")}</th>
                {cols.map((c) => (
                  <th key={c} className="px-3 py-2 font-semibold">
                    {t(`col_${c}`)}
                  </th>
                ))}
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => (
                <tr key={m.id} className="border-b border-line last:border-0 hover:bg-canvas/60">
                  <td className="px-3 py-2">
                    <Link
                      href={`${basePath}/${m.id}`}
                      className="flex items-center gap-2 font-medium text-ink hover:text-brand"
                    >
                      <MaterialVisual
                        image={m.image}
                        swatchHex={m.swatchHex}
                        category={m.category}
                        alt={name(m)}
                        className="h-6 w-6 shrink-0 rounded-[4px]"
                      />
                      <span className="truncate">{name(m)}</span>
                    </Link>
                  </td>
                  {cols.map((c) => (
                    <td key={c} className="whitespace-nowrap px-3 py-2 text-sub">
                      {c === "price" ? (
                        <span className="font-semibold text-brand">{priceText(m)}</span>
                      ) : c === "category" ? (
                        categoryLabel(m.category, locale)
                      ) : (
                        (m[c] ?? "—") || "—"
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right">
                    <AddToProjectButton materialId={m.id} fallbackHref={addFallbackHref} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CompareBar
        items={compare}
        locale={locale}
        onOpen={() => setCompareOpen(true)}
        onClear={clearCompare}
        onRemove={removeCompare}
      />
      <CompareModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        items={compare}
        locale={locale}
        addFallbackHref={addFallbackHref}
        onRemove={removeCompare}
      />
    </div>
  );
}
