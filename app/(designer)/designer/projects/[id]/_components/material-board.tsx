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

// ── PNG export: draw the board onto a canvas (2x) with a MatList watermark ──
async function exportBoardPng(
  tiles: { tile: BoardTile; info: TileInfo }[],
  fileName: string,
): Promise<void> {
  const pad = 24;
  const maxX = Math.max(320, ...tiles.map((t) => t.tile.x + t.tile.w));
  const maxY = Math.max(240, ...tiles.map((t) => t.tile.y + t.tile.h));
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = (maxX + pad * 2) * scale;
  canvas.height = (maxY + pad * 2 + 28) * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const loadImg = (src: string) =>
    new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });

  const ordered = [...tiles].sort((a, b) => a.tile.z - b.tile.z);
  for (const { tile, info } of ordered) {
    const x = tile.x + pad;
    const y = tile.y + pad;
    const o = info.option;
    ctx.save();
    // rounded clip
    const r = 10;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + tile.w, y, x + tile.w, y + tile.h, r);
    ctx.arcTo(x + tile.w, y + tile.h, x, y + tile.h, r);
    ctx.arcTo(x, y + tile.h, x, y, r);
    ctx.arcTo(x, y, x + tile.w, y, r);
    ctx.closePath();
    ctx.clip();

    const img = o.image ? await loadImg(o.image) : null;
    if (img) {
      // cover-crop
      const ir = img.width / img.height;
      const tr = tile.w / tile.h;
      let sw = img.width;
      let sh = img.height;
      if (ir > tr) sw = img.height * tr;
      else sh = img.width / tr;
      ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, tile.w, tile.h);
    } else {
      ctx.fillStyle = o.swatchHex ?? "#c9c2b4";
      ctx.fillRect(x, y, tile.w, tile.h);
    }
    // text gradient + labels inside the image
    const gh = Math.min(52, tile.h * 0.45);
    const grad = ctx.createLinearGradient(0, y + tile.h - gh, 0, y + tile.h);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.68)");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y + tile.h - gh, tile.w, gh);
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 11px 'Noto Sans Thai', sans-serif";
    ctx.fillText(o.name.slice(0, 40), x + 8, y + tile.h - 18, tile.w - 16);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "10px 'Noto Sans Thai', sans-serif";
    const sub = [info.itemCode, o.brand, o.price ? `฿${o.price}` : null]
      .filter(Boolean)
      .join(" · ");
    ctx.fillText(sub.slice(0, 48), x + 8, y + tile.h - 6, tile.w - 16);
    ctx.restore();
    if (o.isConfirmed) {
      ctx.strokeStyle = "#12a150";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x + 1, y + 1, tile.w - 2, tile.h - 2);
    }
  }

  // Watermark — ทุกภาพที่แชร์ออกไปคือแบรนด์ของเรา
  ctx.fillStyle = "#f4632a";
  ctx.font = "700 13px 'Noto Sans Thai', sans-serif";
  ctx.fillText("MatList", maxX + pad * 2 - 72, maxY + pad + 20);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
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

  const [layout, setLayout] = useState<BoardLayout>(() => {
    if (initialLayout) return normalizeBoardLayout(initialLayout, tiles.map((ti) => ti.key));
    // 3E mosaic defaults: confirmed = hero tiles, pending options smaller.
    let x = 16;
    let y = 16;
    let rowH = 0;
    const maxW = 900;
    return {
      tiles: tiles.map((ti, i) => {
        const big = ti.option.isConfirmed;
        const w = big ? 224 : 148;
        const h = big ? 180 : 118;
        if (x + w > maxW) {
          x = 16;
          y += rowH + 18;
          rowH = 0;
        }
        const tile = { key: ti.key, x, y, w, h, z: i };
        x += w + 18;
        rowH = Math.max(rowH, h);
        return tile;
      }),
    };
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [presenting, setPresenting] = useState(false);
  const [exporting, setExporting] = useState(false);
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
        <div className="flex items-center gap-2">
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
          <button
            type="button"
            onClick={() => setPresenting(true)}
            className="rounded-pill border border-line-2 px-2.5 py-1 text-xs text-sub hover:border-brand hover:text-brand"
          >
            🎬 {t("boardPresent")}
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={() => {
              setExporting(true);
              void exportBoardPng(
                layout.tiles
                  .map((tl) => ({ tile: tl, info: infoByKey.get(tl.key) }))
                  .filter((x): x is { tile: BoardTile; info: TileInfo } => Boolean(x.info)),
                "matlist-board.png",
              ).finally(() => setExporting(false));
            }}
            className="rounded-pill border border-line-2 px-2.5 py-1 text-xs text-sub hover:border-brand hover:text-brand disabled:opacity-50"
          >
            {exporting ? "⏳" : "🖼"} {t("boardExport")}
          </button>
        </div>
      </div>

      {presenting && (
        <div className="fixed inset-0 z-50 overflow-auto bg-white p-8" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={() => setPresenting(false)}
            aria-label={t("boardPresentClose")}
            className="fixed right-5 top-5 z-10 rounded-pill border border-line-2 bg-surface px-3 py-1.5 text-sm text-sub shadow-soft hover:text-ink"
          >
            ✕ {t("boardPresentClose")}
          </button>
          <div
            className="relative mx-auto"
            style={{ width: Math.max(640, ...layout.tiles.map((tl) => tl.x + tl.w + 32)), height: boardHeight(layout) }}
          >
            {[...layout.tiles]
              .sort((a, b) => a.z - b.z)
              .map((tl) => {
                const info = infoByKey.get(tl.key);
                if (!info) return null;
                const o = info.option;
                return (
                  <div
                    key={tl.key}
                    className={cn(
                      "absolute overflow-hidden rounded-card shadow-soft",
                      o.isConfirmed && "ring-2 ring-ok",
                    )}
                    style={{
                      left: tl.x,
                      top: tl.y,
                      width: tl.w,
                      height: tl.h,
                      zIndex: tl.z + 1,
                      ...(o.image
                        ? {
                            backgroundImage: `url(${o.image})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : texture(o.swatchHex ?? "#c9c2b4", categoryTexture(o.category))),
                    }}
                  >
                    <div className="pointer-events-none absolute bottom-2 left-2 max-w-[88%] rounded-[9px] bg-white/95 px-2.5 py-1.5 shadow-soft">
                      <div className="font-mono text-[9px] leading-tight text-mut">
                        {info.itemCode}
                        {o.price ? ` · ฿${o.price}` : ""}
                      </div>
                      <div className="truncate text-[11.5px] font-bold leading-tight text-ink">{o.name}</div>
                    </div>
                  </div>
                );
              })}
          </div>
          <div className="mt-6 text-center text-sm font-bold text-brand">MatList</div>
        </div>
      )}

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
                !o.isConfirmed && "opacity-60",
                isSel ? "ring-2 ring-brand opacity-100" : "ring-1 ring-line-2",
              )}
              style={{
                left: tl.x,
                top: tl.y,
                width: tl.w,
                height: tl.h,
                zIndex: tl.z + 1,
                ...(o.image
                  ? {
                      backgroundImage: `url(${o.image})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : texture(o.swatchHex ?? "#c9c2b4", categoryTexture(o.category))),
              }}
            >
              {/* ข้อมูลวัสดุวางอยู่ภายในรูป — gradient ให้อ่านออกบนทุกสี */}
              {/* 3E: white label pill inside the tile — mono code + bold name */}
              <div className="pointer-events-none absolute bottom-2 left-2 max-w-[88%] rounded-[9px] bg-white/95 px-2.5 py-1.5 shadow-soft">
                <div className="font-mono text-[9px] leading-tight text-mut">
                  {info.itemCode}
                  {!o.isConfirmed && " · opt"}
                  {o.price ? ` · ฿${o.price}` : ""}
                </div>
                <div className="truncate text-[11.5px] font-bold leading-tight text-ink">
                  {o.name}
                </div>
              </div>

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
