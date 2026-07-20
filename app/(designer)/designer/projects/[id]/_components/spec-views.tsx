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

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <span className="font-semibold text-ink">{t("materialList")}</span>

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
