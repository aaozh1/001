"use client";

import { useTranslations } from "next-intl";
import { Button, Modal } from "@/components/ui";
import { cn } from "@/lib/ui/cn";
import { categoryLabel } from "@/lib/materials/categories";
import { MaterialVisual } from "@/app/_components/material-visual";
import type { MaterialSummary } from "@/lib/materials/service";
import { AddToProjectButton } from "@/app/(designer)/designer/catalog/_components/add-to-project-button";

// Catalog compare — a user picks materials from the grid (checkbox on each
// card) and lines them up side-by-side. Selection is user-driven and the
// columns keep the pick order, so nothing here ranks or promotes a seller
// (iron rule #1: no bought ranking / no boost on the compare surface).

/** Max side-by-side columns — mirrors the ≤4-options rule used in projects. */
export const COMPARE_MAX = 4;

function priceText(m: MaterialSummary) {
  return m.price ? `฿${Number(m.price).toLocaleString()}${m.unit ? ` / ${m.unit}` : ""}` : "—";
}

// Floating bar (bottom-center) summarising the current selection. Shows the
// thumbnails, the count, and the button that opens the compare table.
export function CompareBar({
  items,
  locale,
  onOpen,
  onClear,
  onRemove,
}: {
  items: MaterialSummary[];
  locale: string;
  onOpen: () => void;
  onClear: () => void;
  onRemove: (id: string) => void;
}) {
  const t = useTranslations("catalog");
  if (items.length === 0) return null;
  const name = (m: MaterialSummary) =>
    locale === "en" && m.nameEn ? m.nameEn : m.nameTh;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-full items-center gap-3 rounded-pill border border-line-2 bg-surface px-3 py-2 shadow-lifted">
        <div className="flex -space-x-2">
          {items.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onRemove(m.id)}
              title={`${name(m)} · ${t("compareRemove")}`}
              className="group relative shrink-0"
            >
              <MaterialVisual
                image={m.image}
                swatchHex={m.swatchHex}
                category={m.category}
                alt={name(m)}
                className="h-9 w-9 rounded-[7px] border-2 border-surface"
              />
              <span className="absolute inset-0 flex items-center justify-center rounded-[7px] bg-ink/55 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100">
                ✕
              </span>
            </button>
          ))}
        </div>
        <span className="hidden whitespace-nowrap text-sm text-sub sm:inline">
          {t("compareSelected", { n: items.length })}
        </span>
        <Button size="sm" disabled={items.length < 2} onClick={onOpen}>
          {t("compareOpen")} ({items.length})
        </Button>
        <button
          type="button"
          onClick={onClear}
          aria-label={t("compareClear")}
          title={t("compareClear")}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-pill text-mut transition hover:bg-canvas-2 hover:text-ink"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// Side-by-side spec table. First column is the attribute label; each following
// column is one selected material, in the order the user picked them.
export function CompareModal({
  open,
  onClose,
  items,
  locale,
  addFallbackHref,
  onRemove,
}: {
  open: boolean;
  onClose: () => void;
  items: MaterialSummary[];
  locale: string;
  addFallbackHref?: string;
  onRemove: (id: string) => void;
}) {
  const t = useTranslations("catalog");
  const name = (m: MaterialSummary) =>
    locale === "en" && m.nameEn ? m.nameEn : m.nameTh;
  const spec = (m: MaterialSummary) =>
    locale === "en" && m.specEn ? m.specEn : m.specTh;

  // Attribute rows — labels reuse the existing catalog keys.
  const rows: { label: string; render: (m: MaterialSummary) => React.ReactNode }[] = [
    { label: t("col_brand"), render: (m) => m.brand ?? "—" },
    { label: t("col_model"), render: (m) => m.model ?? "—" },
    {
      label: t("col_price"),
      render: (m) => <span className="font-semibold text-brand-deep">{priceText(m)}</span>,
    },
    { label: t("col_category"), render: (m) => categoryLabel(m.category, locale) },
    { label: t("keySpec"), render: (m) => spec(m) ?? "—" },
    { label: t("size"), render: (m) => m.size ?? "—" },
    { label: t("color"), render: (m) => m.color ?? "—" },
    { label: t("std"), render: (m) => m.cert ?? "—" },
    { label: t("lead"), render: (m) => m.leadTime ?? "—" },
    { label: t("warranty"), render: (m) => m.warranty ?? "—" },
    { label: t("moq"), render: (m) => m.moq ?? "—" },
  ];

  return (
    <Modal open={open} onClose={onClose} title={t("compareTitle")} wide>
      <p className="text-sm text-sub">{t("compareHint")}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-24 px-2 py-2" />
              {items.map((m) => (
                <th key={m.id} className="min-w-[130px] px-2 py-2 text-left align-top">
                  <div className="relative">
                    <MaterialVisual
                      image={m.image}
                      swatchHex={m.swatchHex}
                      category={m.category}
                      alt={name(m)}
                      className="mb-2 rounded-card"
                    />
                    <button
                      type="button"
                      onClick={() => onRemove(m.id)}
                      aria-label={t("compareRemove")}
                      title={t("compareRemove")}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-pill bg-white/92 text-xs text-sub shadow-soft transition hover:bg-brand hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <span className="block font-bold leading-snug text-ink">{name(m)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.label} className={cn("border-t border-line", i % 2 ? "bg-canvas/40" : "")}>
                <th className="whitespace-nowrap px-2 py-2 text-left align-top text-xs font-medium text-mut">
                  {r.label}
                </th>
                {items.map((m) => (
                  <td key={m.id} className="px-2 py-2 align-top text-sub">
                    {r.render(m)}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-line">
              <th className="px-2 py-2" />
              {items.map((m) => (
                <td key={m.id} className="px-2 py-2 align-top">
                  <AddToProjectButton materialId={m.id} fallbackHref={addFallbackHref} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
