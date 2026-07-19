"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { StatusChip, Swatch } from "@/components/ui";
import { cn } from "@/lib/ui/cn";
import { categoryTexture } from "@/lib/materials/categories";
import { boardOrder } from "@/lib/spec/board";
import { SpecTable } from "./spec-table";
import { SPEC_VIEWS, type SpecRow, type SpecView } from "./types";

const VIEW_LABEL: Record<SpecView, string> = {
  full: "vFull",
  compact: "vCompact",
  grid: "vGrid",
  board: "vBoard",
};

export function SpecViews({
  projectId,
  items,
  canManage,
}: {
  projectId: string;
  items: SpecRow[];
  canManage: boolean;
}) {
  const t = useTranslations("projects");
  const [view, setView] = useState<SpecView>("full");

  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <span className="font-semibold text-ink">{t("specItems")}</span>
        <div className="inline-flex rounded-pill border border-line-2 bg-canvas p-0.5 text-xs">
          {SPEC_VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={cn(
                "rounded-pill px-3 py-1 font-medium transition-colors",
                view === v ? "bg-brand text-white" : "text-sub hover:text-ink",
              )}
            >
              {t(VIEW_LABEL[v])}
            </button>
          ))}
        </div>
      </div>

      {view === "full" && (
        <SpecTable projectId={projectId} items={items} canManage={canManage} />
      )}
      {view === "compact" && <CompactView items={items} />}
      {view === "grid" && <GridView items={items} />}
      {view === "board" && <BoardView items={items} />}
    </div>
  );
}

function confirmedOf(row: SpecRow) {
  return row.options.find((o) => o.isConfirmed) ?? null;
}

function OptSwatch({
  hex,
  category,
  className,
}: {
  hex: string | null;
  category: string;
  className?: string;
}) {
  return (
    <Swatch
      color={hex ?? "#c9c2b4"}
      texture={categoryTexture(category)}
      className={className}
    />
  );
}

// ── Compact: dense read table ─────────────────────────────────────────
function CompactView({ items }: { items: SpecRow[] }) {
  const t = useTranslations("projects");
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-mut">
              <th className="px-4 py-2 font-semibold">{t("colCode")}</th>
              <th className="px-4 py-2 font-semibold">{t("colZone")}</th>
              <th className="px-4 py-2 font-semibold">{t("colQty")}</th>
              <th className="px-4 py-2 font-semibold">{t("confirmedMaterial")}</th>
              <th className="px-4 py-2 font-semibold">{t("colStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const c = confirmedOf(it);
              return (
                <tr key={it.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2 font-medium text-ink">{it.code}</td>
                  <td className="px-4 py-2 text-sub">{it.zone || "—"}</td>
                  <td className="px-4 py-2 text-sub">
                    {it.qty ? `${it.qty} ${it.qtyUnit}` : "—"}
                  </td>
                  <td className="px-4 py-2">
                    {c ? (
                      <span className="flex items-center gap-2">
                        <OptSwatch hex={c.swatchHex} category={c.category} className="h-5 w-5 rounded-[4px]" />
                        <span className="text-ink">{c.name}</span>
                      </span>
                    ) : (
                      <span className="text-mut">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <StatusChip status={it.status} count={it.options.length || undefined} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-3 text-xs text-mut">{t("editInFull")}</p>
    </div>
  );
}

// ── Grid: a card per spec line ────────────────────────────────────────
function GridView({ items }: { items: SpecRow[] }) {
  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <div key={it.id} className="flex flex-col gap-2 rounded-card border border-line bg-surface p-3 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-ink">{it.code}</span>
            <StatusChip status={it.status} count={it.options.length || undefined} />
          </div>
          <div className="text-xs text-sub">
            {[it.zone, it.qty ? `${it.qty} ${it.qtyUnit}` : ""].filter(Boolean).join(" · ") || "—"}
          </div>
          {it.options.length > 0 ? (
            <div className="mt-1 flex gap-1.5">
              {boardOrder(it.options).map((o) => (
                <OptSwatch
                  key={o.materialId}
                  hex={o.swatchHex}
                  category={o.category}
                  className={cn("h-9 w-9 rounded-[6px]", !o.isConfirmed && "opacity-40")}
                />
              ))}
            </div>
          ) : (
            <div className="text-xs text-mut">—</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Material Board: mood/tone wall of swatches ────────────────────────
function BoardView({ items }: { items: SpecRow[] }) {
  const t = useTranslations("projects");
  const withOptions = items.filter((i) => i.options.length > 0);

  if (withOptions.length === 0) {
    return <p className="p-8 text-center text-sm text-sub">{t("boardEmpty")}</p>;
  }

  return (
    <div className="p-4">
      <p className="mb-4 text-xs text-mut">{t("boardHint")}</p>
      <div className="flex flex-col gap-5">
        {withOptions.map((it) => (
          <div key={it.id}>
            <div className="mb-2 text-xs font-medium text-sub">
              {it.code}
              {it.zone ? ` · ${it.zone}` : ""}
            </div>
            <div className="flex flex-wrap items-end gap-2">
              {boardOrder(it.options).map((o) => (
                <figure key={o.materialId} className="flex flex-col items-center gap-1">
                  <OptSwatch
                    hex={o.swatchHex}
                    category={o.category}
                    className={cn(
                      o.isConfirmed
                        ? "h-24 w-24 rounded-card ring-2 ring-ok"
                        : "h-16 w-16 rounded-sm opacity-45",
                    )}
                  />
                  <figcaption className="max-w-[6rem] truncate text-[11px] text-mut">
                    {o.name}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
