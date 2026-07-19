"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, StatusChip } from "@/components/ui";
import { cn } from "@/lib/ui/cn";
import type { SpecStatus } from "@/lib/spec/status";
import { moveItem } from "@/lib/spec/reorder";
import {
  createItemAction,
  deleteItemAction,
  reorderItemsAction,
  updateItemAction,
} from "@/lib/spec/actions";

export interface SpecRow {
  id: string;
  code: string;
  zone: string;
  category: string;
  qty: string;
  qtyUnit: string;
  optionCount: number;
  status: SpecStatus;
}

const cell =
  "w-full rounded-sm border border-transparent bg-transparent px-2 py-1 text-sm outline-none hover:border-line-2 focus:border-brand focus:bg-surface";

export function SpecTable({
  projectId,
  items,
  canManage,
}: {
  projectId: string;
  items: SpecRow[];
  canManage: boolean;
}) {
  const t = useTranslations("projects");
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<unknown>) => startTransition(() => void fn());

  const orderedIds = items.map((i) => i.id);

  function move(id: string, dir: -1 | 1) {
    const next = moveItem(orderedIds, id, dir);
    if (next.join() !== orderedIds.join()) {
      run(() => reorderItemsAction(projectId, next));
    }
  }

  function addRow() {
    const code = `R-${String(items.length + 1).padStart(2, "0")}`;
    run(() => createItemAction(projectId, code));
  }

  function remove(id: string) {
    if (window.confirm(t("deleteRowConfirm"))) {
      run(() => deleteItemAction(projectId, id));
    }
  }

  return (
    <div className={cn(pending && "opacity-70 transition-opacity")}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-mut">
              <th className="px-4 py-2 font-semibold">{t("colCode")}</th>
              <th className="px-4 py-2 font-semibold">{t("colZone")}</th>
              <th className="px-4 py-2 font-semibold">{t("colCategory")}</th>
              <th className="px-4 py-2 font-semibold">{t("colQty")}</th>
              <th className="px-4 py-2 font-semibold">{t("colStatus")}</th>
              {canManage && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 6 : 5} className="px-4 py-8 text-center text-sub">
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
                  pending={pending}
                  isFirst={i === 0}
                  isLast={i === items.length - 1}
                  onUpdate={(input) =>
                    run(() => updateItemAction(projectId, item.id, input))
                  }
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
          <Button variant="ghost" size="sm" onClick={addRow} disabled={pending}>
            {t("addRow")}
          </Button>
        </div>
      )}
    </div>
  );
}

function Row({
  item,
  canManage,
  pending,
  isFirst,
  isLast,
  onUpdate,
  onMove,
  onDelete,
}: {
  projectId: string;
  item: SpecRow;
  canManage: boolean;
  pending: boolean;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (input: Record<string, string | number | null>) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
}) {
  const t = useTranslations("projects");

  // Commit a text field on blur if it actually changed.
  const commitText =
    (field: "code" | "zone" | "category" | "qtyUnit", original: string) =>
    (e: React.FocusEvent<HTMLInputElement>) => {
      const value = e.target.value.trim();
      if (field === "code" && value === "") {
        e.target.value = original; // code is required — revert empty edits
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
      e.target.value = item.qty; // reject bad input
      return;
    }
    onUpdate({ qty: n });
  };

  if (!canManage) {
    return (
      <tr className="border-b border-line last:border-0">
        <td className="px-4 py-2.5 font-medium text-ink">{item.code}</td>
        <td className="px-4 py-2.5 text-sub">{item.zone || "—"}</td>
        <td className="px-4 py-2.5 text-sub">{item.category || "—"}</td>
        <td className="px-4 py-2.5 text-sub">
          {item.qty ? `${item.qty} ${item.qtyUnit}` : "—"}
        </td>
        <td className="px-4 py-2.5">
          <StatusChip status={item.status} count={item.optionCount || undefined} />
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-line last:border-0">
      <td className="px-2 py-1.5">
        <input
          defaultValue={item.code}
          onBlur={commitText("code", item.code)}
          className={cn(cell, "font-medium text-ink")}
          aria-label={t("colCode")}
        />
      </td>
      <td className="px-2 py-1.5">
        <input
          defaultValue={item.zone}
          onBlur={commitText("zone", item.zone)}
          className={cell}
          aria-label={t("colZone")}
        />
      </td>
      <td className="px-2 py-1.5">
        <input
          defaultValue={item.category}
          onBlur={commitText("category", item.category)}
          className={cell}
          aria-label={t("colCategory")}
        />
      </td>
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-1">
          <input
            defaultValue={item.qty}
            onBlur={commitQty}
            inputMode="decimal"
            className={cn(cell, "w-20")}
            aria-label={t("colQty")}
          />
          <input
            defaultValue={item.qtyUnit}
            onBlur={commitText("qtyUnit", item.qtyUnit)}
            placeholder={t("qtyUnitPlaceholder")}
            className={cn(cell, "w-16 text-sub")}
            aria-label={t("qtyUnitPlaceholder")}
          />
        </div>
      </td>
      <td className="px-4 py-1.5">
        <StatusChip status={item.status} count={item.optionCount || undefined} />
      </td>
      <td className="px-2 py-1.5">
        <div className="flex items-center justify-end gap-1 text-mut">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={pending || isFirst}
            aria-label={t("moveUp")}
            className="rounded px-1.5 py-0.5 hover:text-ink disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={pending || isLast}
            aria-label={t("moveDown")}
            className="rounded px-1.5 py-0.5 hover:text-ink disabled:opacity-30"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            aria-label={t("deleteRow")}
            className="rounded px-1.5 py-0.5 hover:text-brand disabled:opacity-30"
          >
            ✕
          </button>
        </div>
      </td>
    </tr>
  );
}
