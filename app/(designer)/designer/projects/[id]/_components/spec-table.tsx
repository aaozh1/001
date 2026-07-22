"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, StatusChip, UndoToast } from "@/components/ui";
import { cn } from "@/lib/ui/cn";
import { moveItem } from "@/lib/spec/reorder";
import {
  createItemAction,
  deleteItemUndoableAction,
  reorderItemsAction,
  restoreItemAction,
  updateItemAction,
} from "@/lib/spec/actions";
import type { ItemSnapshot } from "@/lib/spec/service";
import { SpecOptionsPanel } from "./spec-options-panel";
import { QuoteCompareButton } from "./quote-compare";
import { ChatWithSellerButton } from "./chat-with-seller";
import { RfqTimeline } from "./rfq-timeline";
import { type MlistCol, type SpecRow, rowMaterial } from "./types";

export type { SpecRow } from "./types";

const cell =
  "w-full rounded-sm border border-transparent bg-transparent px-2 py-1 text-sm outline-none hover:border-line-2 focus:border-brand focus:bg-surface";

const WIDTHS_KEY = "matlist.mlist.widths";

export function SpecTable({
  projectId,
  items,
  canManage,
  cols,
  selected,
  sendable,
  onToggleSelect,
}: {
  projectId: string;
  items: SpecRow[];
  canManage: boolean;
  cols: MlistCol[];
  selected: Set<string>;
  sendable: Set<string>;
  onToggleSelect: (id: string) => void;
}) {
  const t = useTranslations("projects");
  const [pending, startTransition] = useTransition();
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [undo, setUndo] = useState<{ snapshot: ItemSnapshot; code: string } | null>(null);
  const dragRef = useRef<{ key: string; startX: number; startW: number } | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(WIDTHS_KEY);
      if (raw) setWidths(JSON.parse(raw) as Record<string, number>);
    } catch {
      // Ignore corrupt saved widths.
    }
  }, []);

  // Column-width drag (ปรับความกว้างคอลัมน์ได้): pointer on the header edge.
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = dragRef.current;
      if (!d) return;
      const w = Math.max(56, d.startW + (e.clientX - d.startX));
      setWidths((prev) => ({ ...prev, [d.key]: w }));
    }
    function onUp() {
      if (!dragRef.current) return;
      dragRef.current = null;
      setWidths((prev) => {
        window.localStorage.setItem(WIDTHS_KEY, JSON.stringify(prev));
        return prev;
      });
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  function startResize(key: string, e: React.PointerEvent<HTMLSpanElement>) {
    const th = (e.target as HTMLElement).closest("th");
    dragRef.current = { key, startX: e.clientX, startW: th?.offsetWidth ?? 120 };
    e.preventDefault();
  }

  const run = (fn: () => Promise<unknown>) => startTransition(() => void fn());
  const orderedIds = items.map((i) => i.id);
  const colSpan = 6 + cols.length + (canManage ? 2 : 0);

  function move(id: string, dir: -1 | 1) {
    const next = moveItem(orderedIds, id, dir);
    if (next.join() !== orderedIds.join()) run(() => reorderItemsAction(projectId, next));
  }

  function addRow() {
    const code = `R-${String(items.length + 1).padStart(2, "0")}`;
    run(() => createItemAction(projectId, code));
  }

  // Delete is instant with a 6-second "เลิกทำ" — no blunt confirm dialog.
  function remove(id: string) {
    const code = items.find((i) => i.id === id)?.code ?? "";
    run(async () => {
      const r = await deleteItemUndoableAction(projectId, id);
      if (r.ok) setUndo({ snapshot: r.snapshot, code });
    });
  }

  const Th = ({
    label,
    colKey,
    className,
  }: {
    label: string;
    colKey: string;
    className?: string;
  }) => (
    <th
      style={widths[colKey] ? { width: widths[colKey], minWidth: widths[colKey] } : undefined}
      className={cn("relative px-4 py-2 font-semibold", className)}
    >
      {label}
      <span
        onPointerDown={(e) => startResize(colKey, e)}
        title={t("resizeCol")}
        className="absolute -right-0.5 top-0 z-10 h-full w-1.5 cursor-col-resize select-none hover:bg-brand/40"
      />
    </th>
  );

  return (
    <div className={cn(pending && "opacity-70 transition-opacity")}>
      {/* Mobile: stacked cards (ตารางกว้างเกินจอเล็ก) */}
      <div className="flex flex-col gap-2 p-3 sm:hidden">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-sub">{t("noItems")}</p>
        ) : (
          items.map((item) => (
            <MobileRow
              key={item.id}
              projectId={projectId}
              item={item}
              canManage={canManage}
              checked={selected.has(item.id)}
              checkable={sendable.has(item.id)}
              onToggleSelect={() => onToggleSelect(item.id)}
            />
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-line font-mono text-[11px] uppercase tracking-[.05em] text-mut">
              {canManage && <th className="w-8 px-2 py-2" />}
              <th className="w-8 px-2 py-2" />
              <Th label={t("colCode")} colKey="code" />
              <Th label={t("colZone")} colKey="zone" />
              <Th label={t("colCategory")} colKey="category" />
              <Th label={t("colQty")} colKey="qty" />
              {cols.map((c) => (
                <Th key={c} label={t(`mcol_${c}`)} colKey={c} />
              ))}
              <Th label={t("colStatus")} colKey="status" />
              {canManage && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-center text-sub">
                  {t("noItems")}
                </td>
              </tr>
            ) : (
              items.map((item, i) => (
                <Row
                  key={item.id}
                  projectId={projectId}
                  item={item}
                  canManage={canManage}
                  cols={cols}
                  pending={pending}
                  isFirst={i === 0}
                  isLast={i === items.length - 1}
                  colSpan={colSpan}
                  checked={selected.has(item.id)}
                  checkable={sendable.has(item.id)}
                  onToggleSelect={() => onToggleSelect(item.id)}
                  onUpdate={(input) => run(() => updateItemAction(projectId, item.id, input))}
                  onMove={(dir) => move(item.id, dir)}
                  onDelete={() => remove(item.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {canManage && (
        <div className="border-t border-line p-3">
          <Button variant="ghost" size="sm" onClick={addRow} disabled={pending} data-add-row>
            {t("addRow")}
          </Button>
        </div>
      )}

      {undo && (
        <UndoToast
          message={t("rowDeleted", { code: undo.code })}
          undoLabel={t("undo")}
          onUndo={() => {
            const snap = undo.snapshot;
            setUndo(null);
            run(() => restoreItemAction(projectId, snap));
          }}
          onExpire={() => setUndo(null)}
        />
      )}
    </div>
  );
}

// Read-first mobile card: the facts + RFQ checkbox + expandable options.
function MobileRow({
  projectId,
  item,
  canManage,
  checked,
  checkable,
  onToggleSelect,
}: {
  projectId: string;
  item: SpecRow;
  canManage: boolean;
  checked: boolean;
  checkable: boolean;
  onToggleSelect: () => void;
}) {
  const t = useTranslations("projects");
  const [expanded, setExpanded] = useState(false);
  const mat = rowMaterial(item);

  return (
    <div className="rounded-card border border-line bg-surface p-3 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {canManage && (
            <input
              type="checkbox"
              checked={checked && checkable}
              disabled={!checkable}
              onChange={onToggleSelect}
              aria-label={t("selectForRfq", { code: item.code })}
              className="h-4 w-4 accent-brand disabled:opacity-30"
            />
          )}
          <span className="font-semibold text-ink">{item.code}</span>
        </div>
        <StatusChip status={item.status} count={item.options.length || undefined} />
      </div>
      <div className="mt-1 text-xs text-sub">
        {[item.zone, item.category, item.qty ? `${item.qty} ${item.qtyUnit}` : ""]
          .filter(Boolean)
          .join(" · ") || "—"}
      </div>
      {mat && (
        <div className="mt-1 text-sm text-ink">
          {mat.name}
          {mat.price ? (
            <span className="text-brand"> · ฿{mat.price}{mat.unit ? `/${mat.unit}` : ""}</span>
          ) : null}
        </div>
      )}
      {item.options.length > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-2 text-xs font-medium text-brand"
        >
          {expanded ? "▾" : "▸"} {t("viewOptions")} ({item.options.length})
        </button>
      )}
      {expanded && (
        <div className="mt-1 rounded-card border border-line bg-canvas/50">
          <SpecOptionsPanel
            projectId={projectId}
            itemId={item.id}
            options={item.options}
            canManage={canManage}
          />
        </div>
      )}
    </div>
  );
}

function Row({
  projectId,
  item,
  canManage,
  cols,
  pending,
  isFirst,
  isLast,
  colSpan,
  checked,
  checkable,
  onToggleSelect,
  onUpdate,
  onMove,
  onDelete,
}: {
  projectId: string;
  item: SpecRow;
  canManage: boolean;
  cols: MlistCol[];
  pending: boolean;
  isFirst: boolean;
  isLast: boolean;
  colSpan: number;
  checked: boolean;
  checkable: boolean;
  onToggleSelect: () => void;
  onUpdate: (input: Record<string, string | number | null>) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
}) {
  const t = useTranslations("projects");
  const tr = useTranslations("rfq");
  const [expanded, setExpanded] = useState(false);

  const commitText =
    (field: "code" | "zone" | "category" | "qtyUnit", original: string) =>
    (e: React.FocusEvent<HTMLInputElement>) => {
      const value = e.target.value.trim();
      if (field === "code" && value === "") {
        e.target.value = original;
        return;
      }
      if (value === original) return;
      onUpdate({ [field]: field === "code" ? value : value || null });
    };

  const commitQty = (e: React.FocusEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim();
    if (raw === (item.qty ?? "")) return;
    if (raw === "") return onUpdate({ qty: null });
    const n = Number(raw);
    if (Number.isNaN(n) || n < 0) {
      e.target.value = item.qty;
      return;
    }
    onUpdate({ qty: n });
  };

  const toggle = (
    <button
      type="button"
      onClick={() => setExpanded((v) => !v)}
      aria-label={t("viewOptions")}
      aria-expanded={expanded}
      className="flex items-center gap-1 rounded px-1 text-mut hover:text-ink"
    >
      <span className={cn("transition-transform", expanded && "rotate-90")}>▸</span>
      <span className="text-xs">{item.options.length || ""}</span>
    </button>
  );

  // Material facts for the optional columns: confirmed material, else the
  // first option (แสดงจาง ๆ ให้รู้ว่ายังไม่ยืนยัน).
  const mat = rowMaterial(item);
  const matConfirmed = !!mat?.isConfirmed;

  return (
    <>
      <tr className="border-b border-line">
        {canManage && (
          <td className="px-2 py-1.5 align-middle">
            <input
              type="checkbox"
              checked={checked && checkable}
              disabled={!checkable}
              onChange={onToggleSelect}
              aria-label={t("selectForRfq", { code: item.code })}
              title={checkable ? t("selectForRfq", { code: item.code }) : t("rfqRowHint")}
              className="h-4 w-4 accent-brand disabled:opacity-30"
            />
          </td>
        )}
        <td className="px-2 py-1.5 align-middle">{toggle}</td>
        {canManage ? (
          <>
            <td className="px-2 py-1.5">
              <input
                defaultValue={item.code}
                onBlur={commitText("code", item.code)}
                className={cn(cell, "font-mono text-[12.5px] font-medium text-ink")}
                aria-label={t("colCode")}
              />
            </td>
            <td className="px-2 py-1.5">
              <input defaultValue={item.zone} onBlur={commitText("zone", item.zone)} className={cell} aria-label={t("colZone")} />
            </td>
            <td className="px-2 py-1.5">
              <input defaultValue={item.category} onBlur={commitText("category", item.category)} className={cell} aria-label={t("colCategory")} />
            </td>
            <td className="px-2 py-1.5">
              <div className="flex items-center gap-1">
                <input defaultValue={item.qty} onBlur={commitQty} inputMode="decimal" className={cn(cell, "w-20 font-mono text-[12.5px]")} aria-label={t("colQty")} />
                <input defaultValue={item.qtyUnit} onBlur={commitText("qtyUnit", item.qtyUnit)} placeholder={t("qtyUnitPlaceholder")} className={cn(cell, "w-16 text-sub")} aria-label={t("qtyUnitPlaceholder")} />
              </div>
            </td>
          </>
        ) : (
          <>
            <td className="px-4 py-2.5"><span className="rounded-[6px] border border-line bg-canvas px-[9px] py-[4px] font-mono text-[12px] text-sub">{item.code}</span></td>
            <td className="px-4 py-2.5 text-sub">{item.zone || "—"}</td>
            <td className="px-4 py-2.5 text-sub">{item.category || "—"}</td>
            <td className="px-4 py-2.5 text-sub">{item.qty ? `${item.qty} ${item.qtyUnit}` : "—"}</td>
          </>
        )}
        {cols.map((c) => {
          if (c === "material") return <MatNameCell key={c} mat={mat} confirmed={matConfirmed} />;
          if (c === "brand") return <FactCell key={c} value={mat?.brand ?? null} confirmed={matConfirmed} />;
          if (c === "model") return <FactCell key={c} value={mat?.model ?? null} confirmed={matConfirmed} />;
          if (c === "price")
            return (
              <FactCell
                key={c}
                value={mat?.price ? `฿${mat.price}${mat.unit ? `/${mat.unit}` : ""}` : null}
                confirmed={matConfirmed}
              />
            );
          if (c === "leadTime") return <FactCell key={c} value={mat?.leadTime ?? null} confirmed={matConfirmed} />;
          if (c === "warranty") return <FactCell key={c} value={mat?.warranty ?? null} confirmed={matConfirmed} />;
          return <FactCell key={c} value={mat?.cert ?? null} confirmed={matConfirmed} />;
        })}
        <td className="px-4 py-1.5">
          <StatusChip status={item.status} count={item.options.length || undefined} />
        </td>
        {canManage && (
          <td className="px-2 py-1.5">
            <div className="flex items-center justify-end gap-1 text-mut">
              <button type="button" onClick={() => onMove(-1)} disabled={pending || isFirst} aria-label={t("moveUp")} className="rounded px-1.5 py-0.5 hover:text-ink disabled:opacity-30">↑</button>
              <button type="button" onClick={() => onMove(1)} disabled={pending || isLast} aria-label={t("moveDown")} className="rounded px-1.5 py-0.5 hover:text-ink disabled:opacity-30">↓</button>
              <button type="button" onClick={onDelete} disabled={pending} aria-label={t("deleteRow")} className="rounded px-1.5 py-0.5 hover:text-brand disabled:opacity-30">✕</button>
            </div>
          </td>
        )}
      </tr>
      {expanded && (
        <tr className="border-b border-line bg-canvas/50">
          <td colSpan={colSpan} className="p-0">
            <SpecOptionsPanel
              projectId={projectId}
              itemId={item.id}
              options={item.options}
              canManage={canManage}
            />
            {item.rfq.quotes.length > 0 && item.rfq.rfqId && (
              <div className="flex flex-col gap-1.5 border-t border-line px-4 py-3">
                <span className="text-xs font-medium text-mut">
                  {tr("quotesReceived")} ({item.rfq.quotes.length})
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {item.rfq.quotes.map((q) => (
                    <span key={q.quoteId} className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "rounded-pill px-2 py-0.5 text-xs",
                          q.status === "selected"
                            ? "bg-ok-soft font-semibold text-ok"
                            : q.status === "rejected"
                              ? "text-mut line-through"
                              : "text-sub",
                        )}
                      >
                        {q.sellerName} ฿{q.pricePerUnit}
                      </span>
                      {canManage && (
                        <ChatWithSellerButton projectId={projectId} sellerOrgId={q.sellerOrgId} />
                      )}
                    </span>
                  ))}
                </div>
                {canManage && (
                  <div>
                    <QuoteCompareButton
                      projectId={projectId}
                      rfqId={item.rfq.rfqId}
                      rfqStatus={item.rfq.rfqStatus ?? "quoted"}
                      quotes={item.rfq.quotes}
                    />
                  </div>
                )}
              </div>
            )}
            {item.rfq.rfqId && item.rfq.tracking.length > 0 && item.rfq.state !== "closed" && (
              <RfqTimeline
                projectId={projectId}
                rfqId={item.rfq.rfqId}
                tracking={item.rfq.tracking}
                canManage={canManage}
              />
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function FactCell({ value, confirmed }: { value: string | null; confirmed: boolean }) {
  const isPrice = !!value && value.startsWith("฿");
  return (
    <td
      className={cn(
        "whitespace-nowrap px-4 py-1.5 text-sm",
        isPrice && "font-mono text-[12.5px] font-semibold",
        isPrice ? (confirmed ? "text-brand-deep" : "text-mut") : confirmed ? "text-ink" : "text-mut",
      )}
    >
      {value || "—"}
    </td>
  );
}

function MatNameCell({
  mat,
  confirmed,
}: {
  mat: ReturnType<typeof rowMaterial>;
  confirmed: boolean;
}) {
  const t = useTranslations("projects");
  if (!mat) return <td className="px-4 py-1.5 text-mut">—</td>;
  return (
    <td className="px-4 py-1.5">
      <span
        className={cn("text-sm", confirmed ? "font-medium text-ink" : "text-mut")}
        title={confirmed ? undefined : t("unconfirmedMark")}
      >
        {mat.name}
        {confirmed ? "" : " *"}
      </span>
    </td>
  );
}
