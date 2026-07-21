"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { StatusChip, Swatch } from "@/components/ui";
import { cn } from "@/lib/ui/cn";
import { categoryTexture } from "@/lib/materials/categories";
import { boardOrder, type BoardLayout } from "@/lib/spec/board";
import { SpecTable } from "./spec-table";
import { RfqSendModal } from "./rfq-send-modal";
import { SpecBookModal, type SpecBookVersion } from "./spec-book-modal";
import { StudioToolsModal, type SetOption } from "./studio-tools-modal";
import { MaterialBoard } from "./material-board";
import {
  DEFAULT_MLIST_COLS,
  MLIST_COLS,
  type MlistCol,
  SPEC_VIEWS,
  type SpecRow,
  type SpecView,
} from "./types";

const VIEW_LABEL: Record<SpecView, string> = {
  full: "vFull",
  compact: "vCompact",
  grid: "vGrid",
  board: "vBoard",
};

// 4B icon segment (design handoff): one glyph per view.
const VIEW_ICON: Record<SpecView, React.ReactNode> = {
  full: (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="1" y="2" width="14" height="3.4" rx="1.7" />
      <rect x="1" y="7" width="14" height="3.4" rx="1.7" />
      <rect x="1" y="12" width="9" height="3.4" rx="1.7" />
    </svg>
  ),
  compact: (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="1" y="2" width="14" height="2" rx="1" />
      <rect x="1" y="6" width="14" height="2" rx="1" />
      <rect x="1" y="10" width="14" height="2" rx="1" />
      <rect x="1" y="14" width="10" height="2" rx="1" />
    </svg>
  ),
  grid: (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="1" y="1" width="6" height="6" rx="2" />
      <rect x="9" y="1" width="6" height="6" rx="2" />
      <rect x="1" y="9" width="6" height="6" rx="2" />
      <rect x="9" y="9" width="6" height="6" rx="2" />
    </svg>
  ),
  board: (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="1" y="1" width="8" height="14" rx="2.5" />
      <rect x="11" y="1" width="4" height="6" rx="1.8" />
      <rect x="11" y="9" width="4" height="6" rx="1.8" />
    </svg>
  ),
};

const COLS_KEY = "matlist.mlist.cols";

// The Material List surface: table views + the action toolbar above them
// (ขอราคา/ตัวอย่างจากแถวที่เลือก, Spec Book, เครื่องมือ Studio — ปุ่ม icon
// อยู่เหนือตาราง ไม่แยกเป็น section ใหญ่อีกต่อไป).
export function SpecViews({
  projectId,
  items,
  canManage,
  canStudio,
  sets,
  books,
  boardLayout,
}: {
  projectId: string;
  items: SpecRow[];
  canManage: boolean;
  canStudio: boolean;
  sets: SetOption[];
  books: SpecBookVersion[];
  boardLayout: BoardLayout | null;
}) {
  const t = useTranslations("projects");
  const [view, setView] = useState<SpecView>("full");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<"rfq" | "book" | "studio" | null>(null);
  const [cols, setCols] = useState<MlistCol[]>(DEFAULT_MLIST_COLS);
  const [colsOpen, setColsOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(COLS_KEY);
      if (raw) {
        const saved = (JSON.parse(raw) as string[]).filter((c): c is MlistCol =>
          MLIST_COLS.includes(c as MlistCol),
        );
        setCols(saved);
      }
    } catch {
      // Keep defaults on corrupt prefs.
    }
  }, []);

  function toggleCol(c: MlistCol) {
    setCols((prev) => {
      const next = prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c];
      window.localStorage.setItem(COLS_KEY, JSON.stringify(next));
      return next;
    });
  }

  // Only rows that HAVE options and are not already in an RFQ can be sent.
  const sendable = useMemo(
    () => new Set(items.filter((i) => i.options.length > 0 && i.rfq.state === "none").map((i) => i.id)),
    [items],
  );
  const selectedValid = [...selected].filter((id) => sendable.has(id));

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const iconBtn =
    "rounded-pill border border-line-2 px-2.5 py-1.5 text-[13px] text-sub transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40";

  const confirmed = items.filter((i) => i.confirmedMaterialId != null).length;
  const optionsPending = items.filter(
    (i) => i.confirmedMaterialId == null && i.options.length > 0,
  ).length;
  const quoted = items.filter((i) => i.rfq.state === "quoted").length;
  const pct = items.length > 0 ? Math.round((confirmed / items.length) * 100) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-ink">{t("materialList")}</span>
          {/* 4B progress: X of Y specified */}
          <span className="hidden items-center gap-2.5 md:flex">
            <span className="h-[7px] w-[140px] overflow-hidden rounded-pill bg-[#f0ece4]">
              <span
                className="block h-full rounded-pill bg-brand"
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className="font-mono text-[12px] text-mut">
              {t("specProgress", { confirmed, total: items.length })}
            </span>
            <span className="h-[18px] w-px bg-line-2" />
            <span className="font-mono text-[12px] text-mut">
              {t("specMeta", { pending: optionsPending, quoted })}
            </span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <>
              {/* ขอราคา/ตัวอย่าง — works off the rows ticked in the table. */}
              <button
                type="button"
                onClick={() => setModal("rfq")}
                disabled={selectedValid.length === 0}
                title={selectedValid.length === 0 ? t("rfqPickHint") : undefined}
                className={cn(
                  iconBtn,
                  selectedValid.length > 0 &&
                    "border-brand bg-brand font-medium text-white hover:text-white",
                )}
              >
                📨 {t("requestQuote")}
                {selectedValid.length > 0 ? ` (${selectedValid.length})` : ""}
              </button>
              <button
                type="button"
                onClick={() => setModal("book")}
                title={t("specBook")}
                aria-label={t("specBook")}
                className={iconBtn}
              >
                📕
              </button>
              <button
                type="button"
                onClick={() => setModal("studio")}
                title={t("studioTools")}
                aria-label={t("studioTools")}
                className={iconBtn}
              >
                🧰
              </button>
            </>
          )}

          {view === "full" && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setColsOpen((v) => !v)}
                aria-expanded={colsOpen}
                title={t("columnsHint")}
                className={iconBtn}
              >
                ⚙ {t("columns")}
              </button>
              {colsOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-card border border-line bg-surface p-2 shadow-lifted">
                  {MLIST_COLS.map((c) => (
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
                      {t(`mcol_${c}`)}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-[2px] rounded-sm border border-line bg-canvas p-[3px]">
            {SPEC_VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                title={t(VIEW_LABEL[v])}
                aria-label={t(VIEW_LABEL[v])}
                className={cn(
                  "flex h-[30px] w-[34px] items-center justify-center rounded-[7px] transition-colors",
                  view === v
                    ? "border border-line bg-surface text-brand"
                    : "text-mut hover:text-ink",
                )}
              >
                {VIEW_ICON[v]}
              </button>
            ))}
          </div>

          {/* 2D: inline-edit affordance, mono like the mock */}
          {view === "full" && canManage && (
            <span className="hidden font-mono text-[11.5px] text-mut 2xl:inline">
              {t("inlineHint")}
            </span>
          )}
        </div>
      </div>

      {view === "full" && (
        <SpecTable
          projectId={projectId}
          items={items}
          canManage={canManage}
          cols={cols}
          selected={selected}
          sendable={sendable}
          onToggleSelect={toggleSelect}
        />
      )}
      {view === "compact" && <CompactView items={items} />}
      {view === "grid" && <GridView items={items} />}
      {view === "board" && (
        <MaterialBoard projectId={projectId} items={items} canManage={canManage} initialLayout={boardLayout} />
      )}

      {/* 2D bottom bar: ticked summary + RFQ CTA (the mock's Request Samples
          + Quotes row). Same action as the toolbar button. */}
      {view === "full" && canManage && (
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-4 py-3">
          <span className="font-mono text-xs text-mut">
            {t("tickedSummary", { n: selectedValid.length })}
          </span>
          <button
            type="button"
            onClick={() => setModal("rfq")}
            disabled={selectedValid.length === 0}
            className={cn(
              "rounded-sm px-[18px] py-2.5 text-sm font-semibold transition",
              selectedValid.length > 0
                ? "bg-brand text-white hover:bg-brand-deep"
                : "cursor-not-allowed bg-canvas-2 text-mut",
            )}
          >
            📨 {t("requestQuote")}
          </button>
        </div>
      )}

      {canManage && (
        <>
          <RfqSendModal
            open={modal === "rfq"}
            onClose={() => setModal(null)}
            projectId={projectId}
            items={items.filter((i) => selectedValid.includes(i.id))}
            onSent={() => setSelected(new Set())}
          />
          <SpecBookModal
            open={modal === "book"}
            onClose={() => setModal(null)}
            projectId={projectId}
            books={books}
          />
          <StudioToolsModal
            open={modal === "studio"}
            onClose={() => setModal(null)}
            projectId={projectId}
            canStudio={canStudio}
            sets={sets}
          />
        </>
      )}
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

// ── Cards (3O): swatch hero on top, code chip + status, zone as the title ──
function GridView({ items }: { items: SpecRow[] }) {
  const t = useTranslations("projects");
  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((it) => {
        const hero = confirmedOf(it) ?? it.options[0] ?? null;
        return (
          <div
            key={it.id}
            className="flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-soft"
          >
            {hero?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hero.image} alt="" className="h-24 w-full object-cover" />
            ) : (
              <OptSwatch
                hex={hero?.swatchHex ?? "#ece7de"}
                category={hero?.category ?? it.category}
                className="h-24 w-full rounded-none"
              />
            )}
            <div className="flex flex-col gap-1 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-[6px] border border-line px-1.5 py-0.5 font-mono text-[11px] text-sub">
                  {it.code}
                </span>
                <StatusChip status={it.status} count={it.options.length || undefined} />
              </div>
              <div className="mt-1 truncate text-sm font-bold text-ink">
                {it.zone || it.code}
              </div>
              <div className={cn("truncate text-[13px]", hero ? "text-sub" : "text-mut")}>
                {hero ? [hero.name, hero.brand].filter(Boolean).join(" · ") : t("noMaterialYet")}
              </div>
              <div className="font-mono text-xs text-mut">
                {it.qty ? `${it.qty} ${it.qtyUnit}` : "—"}
              </div>
              {it.options.length > 1 && (
                <div className="mt-1 flex gap-1">
                  {boardOrder(it.options).map((o) => (
                    <OptSwatch
                      key={o.materialId}
                      hex={o.swatchHex}
                      category={o.category}
                      className={cn("h-4 w-4 rounded-[3px]", !o.isConfirmed && "opacity-40")}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
