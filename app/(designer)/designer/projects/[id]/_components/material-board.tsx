"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/ui/cn";
import { texture } from "@/lib/ui/texture";
import { categoryTexture } from "@/lib/materials/categories";
import {
  type BoardLayout,
  type BoardTile,
  BOARD_MAX_X,
  BOARD_MAX_Y,
  TILE_MAX,
  TILE_MIN,
  boardHeight,
  bringToFront,
  normalizeBoardLayout,
  sendToBack,
} from "@/lib/spec/board";
import { saveBoardLayoutAction } from "@/lib/spec/board-actions";
import type { OptionView, SpecRow } from "./types";

interface TileInfo {
  key: string;
  itemCode: string;
  option: OptionView;
}

type DragState =
  | { kind: "move"; key: string; startX: number; startY: number; orig: BoardTile }
  | { kind: "resize"; key: string; startX: number; startY: number; orig: BoardTile };

// Material Board — a free mood-board canvas: every option swatch is a tile
// with its info INSIDE the image; drag to move, corner-handle to resize,
// front/back to layer. Layout persists per project.
export function MaterialBoard({
  projectId,
  items,
  canManage,
  initialLayout,
}: {
  projectId: string;
  items: SpecRow[];
  canManage: boolean;
  initialLayout: BoardLayout | null;
}) {
  const t = useTranslations("projects");

  const tiles: TileInfo[] = useMemo(
    () =>
      items.flatMap((it) =>
        it.options.map((o) => ({
          key: `${it.id}:${o.materialId}`,
          itemCode: it.code,
          option: o,
        })),
      ),
    [items],
  );
  const infoByKey = useMemo(() => new Map(tiles.map((ti) => [ti.key, ti])), [tiles]);

  const [layout, setLayout] = useState<BoardLayout>(() =>
    normalizeBoardLayout(initialLayout, tiles.map((ti) => ti.key)),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const dragRef = useRef<DragState | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(layout);
  latest.current = layout;

  // Options changed (added/removed) → reconcile the canvas.
  useEffect(() => {
    setLayout((prev) => normalizeBoardLayout(prev, tiles.map((ti) => ti.key)));
  }, [tiles]);

  function scheduleSave() {
    if (!canManage) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        const r = await saveBoardLayoutAction(projectId, latest.current);
        setSaveState(r.ok ? "saved" : "error");
      } catch {
        setSaveState("error");
      }
    }, 700);
  }

  function mutate(fn: (prev: BoardLayout) => BoardLayout) {
    setLayout((prev) => fn(prev));
    scheduleSave();
  }

  // Pointer-driven drag & resize on the whole canvas.
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      setLayout((prev) => ({
        tiles: prev.tiles.map((tl) => {
          if (tl.key !== d.key) return tl;
          if (d.kind === "move") {
            return {
              ...tl,
              x: Math.min(BOARD_MAX_X, Math.max(0, d.orig.x + dx)),
              y: Math.min(BOARD_MAX_Y, Math.max(0, d.orig.y + dy)),
            };
          }
          return {
            ...tl,
            w: Math.min(TILE_MAX, Math.max(TILE_MIN, d.orig.w + dx)),
            h: Math.min(TILE_MAX, Math.max(TILE_MIN, d.orig.h + dy)),
          };
        }),
      }));
    }
    function onUp() {
      if (!dragRef.current) return;
      dragRef.current = null;
      scheduleSave();
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage, projectId]);

  function startDrag(kind: "move" | "resize", key: string, e: React.PointerEvent) {
    if (!canManage) return;
    const tile = latest.current.tiles.find((tl) => tl.key === key);
    if (!tile) return;
    dragRef.current = { kind, key, startX: e.clientX, startY: e.clientY, orig: tile };
    setSelected(key);
    // Fresh interaction also lifts the tile so it never drags underneath another.
    setLayout((prev) => bringToFront(prev, key));
    e.preventDefault();
    e.stopPropagation();
  }

  if (tiles.length === 0) {
    return <p className="p-8 text-center text-sm text-sub">{t("boardEmpty")}</p>;
  }

  const ordered = [...layout.tiles].sort((a, b) => a.z - b.z);

  return (
    <div className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-mut">
          {canManage ? t("boardDragHint") : t("boardHint")}
        </p>
        {canManage && (
          <span
            className={cn(
              "text-xs",
              saveState === "error" ? "font-medium text-warn" : "text-mut",
            )}
            role={saveState === "error" ? "alert" : undefined}
          >
            {saveState === "saving" && `⏳ ${t("boardSaving")}`}
            {saveState === "saved" && `✓ ${t("boardSaved")}`}
            {saveState === "error" && t("boardSaveFailed")}
          </span>
        )}
      </div>

      <div
        className="relative overflow-hidden rounded-card border border-line bg-canvas"
        style={{ height: boardHeight(layout) }}
        onPointerDown={() => setSelected(null)}
      >
        {ordered.map((tl) => {
          const info = infoByKey.get(tl.key);
          if (!info) return null;
          const o = info.option;
          const isSel = selected === tl.key;
          return (
            <div
              key={tl.key}
              onPointerDown={(e) => startDrag("move", tl.key, e)}
              className={cn(
                "absolute select-none overflow-hidden rounded-card shadow-soft",
                canManage && "cursor-grab active:cursor-grabbing",
                o.isConfirmed ? "ring-2 ring-ok" : "ring-1 ring-line-2",
                isSel && "ring-2 ring-brand",
              )}
              style={{
                left: tl.x,
                top: tl.y,
                width: tl.w,
                height: tl.h,
                zIndex: tl.z + 1,
                ...texture(o.swatchHex ?? "#c9c2b4", categoryTexture(o.category)),
              }}
            >
              {/* ข้อมูลวัสดุวางอยู่ภายในรูป — gradient ให้อ่านออกบนทุกสี */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-2 pb-1.5 pt-6">
                <div className="truncate text-[11px] font-semibold leading-tight text-white">
                  {o.name}
                </div>
                <div className="truncate text-[10px] text-white/80">
                  {[info.itemCode, o.brand].filter(Boolean).join(" · ")}
                  {o.price ? ` · ฿${o.price}` : ""}
                </div>
              </div>
              {o.isConfirmed && (
                <span className="absolute left-1.5 top-1.5 rounded-pill bg-ok px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  ✓
                </span>
              )}

              {canManage && isSel && (
                <>
                  {/* Layer controls (หน้า/หลัง) */}
                  <div className="absolute right-1 top-1 flex gap-1">
                    <button
                      type="button"
                      title={t("boardToFront")}
                      aria-label={t("boardToFront")}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => mutate((prev) => bringToFront(prev, tl.key))}
                      className="rounded bg-black/55 px-1.5 py-0.5 text-[11px] text-white hover:bg-black/75"
                    >
                      ⬆
                    </button>
                    <button
                      type="button"
                      title={t("boardToBack")}
                      aria-label={t("boardToBack")}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => mutate((prev) => sendToBack(prev, tl.key))}
                      className="rounded bg-black/55 px-1.5 py-0.5 text-[11px] text-white hover:bg-black/75"
                    >
                      ⬇
                    </button>
                  </div>
                  {/* Resize handle */}
                  <span
                    onPointerDown={(e) => startDrag("resize", tl.key, e)}
                    title={t("boardResize")}
                    className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize rounded-tl bg-brand/80"
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
