// Pure helpers for the Material Board view (unit-tested). The board is a free
// canvas of material swatches: each tile can be dragged, resized and layered
// (front/back); the layout persists per project (Project.boardLayout).

import { z } from "zod";

export interface BoardOption {
  materialId: string;
  isConfirmed: boolean;
}

export type Emphasis = "primary" | "faded";

/** Confirmed option → primary, everything else → faded. */
export function optionEmphasis(o: BoardOption): Emphasis {
  return o.isConfirmed ? "primary" : "faded";
}

/**
 * Order an item's options for the grid view: the confirmed one first, the rest
 * keep their given order. Keeps the "hero" swatch leading each item's group.
 */
export function boardOrder<T extends BoardOption>(options: readonly T[]): T[] {
  return [...options].sort((a, b) => Number(b.isConfirmed) - Number(a.isConfirmed));
}

// ── Free-canvas layout ─────────────────────────────────────────────────

// Canvas bounds & tile size limits (px in the board's coordinate space).
export const BOARD_MAX_X = 2400;
export const BOARD_MAX_Y = 6000;
export const TILE_MIN = 72;
export const TILE_MAX = 520;

export interface BoardTile {
  /** `${specItemId}:${materialId}` — a material can appear on several lines. */
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
}

export interface BoardLayout {
  tiles: BoardTile[];
}

export const boardLayoutSchema = z.object({
  tiles: z
    .array(
      z.object({
        key: z.string().min(3).max(120),
        x: z.number().finite(),
        y: z.number().finite(),
        w: z.number().finite(),
        h: z.number().finite(),
        z: z.number().finite(),
      }),
    )
    .max(400),
});

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(v)));

/** Default position for the nth tile: a loose 4-per-row grid. */
export function defaultTile(key: string, index: number): BoardTile {
  const cols = 4;
  const w = 176;
  const h = 150;
  const gap = 18;
  return {
    key,
    x: 16 + (index % cols) * (w + gap),
    y: 16 + Math.floor(index / cols) * (h + gap),
    w,
    h,
    z: index,
  };
}

/**
 * Reconcile a stored layout with the CURRENT set of tile keys: drop tiles for
 * removed options, append defaults for new ones, clamp geometry into bounds
 * and re-pack z into 0..n-1 (stable by existing z).
 */
export function normalizeBoardLayout(
  layout: BoardLayout | null | undefined,
  keys: readonly string[],
): BoardLayout {
  const byKey = new Map((layout?.tiles ?? []).map((t) => [t.key, t]));
  const tiles: BoardTile[] = keys.map((key, i) => {
    const t = byKey.get(key);
    if (!t) return defaultTile(key, i);
    return {
      key,
      x: clamp(t.x, 0, BOARD_MAX_X),
      y: clamp(t.y, 0, BOARD_MAX_Y),
      w: clamp(t.w, TILE_MIN, TILE_MAX),
      h: clamp(t.h, TILE_MIN, TILE_MAX),
      z: t.z,
    };
  });
  // Re-pack z: stable order by current z, then key for determinism.
  const order = [...tiles].sort((a, b) => a.z - b.z || a.key.localeCompare(b.key));
  const zOf = new Map(order.map((t, i) => [t.key, i]));
  return { tiles: tiles.map((t) => ({ ...t, z: zOf.get(t.key) ?? 0 })) };
}

/** Move a tile to the top of the stack (แสดงด้านหน้า). */
export function bringToFront(layout: BoardLayout, key: string): BoardLayout {
  const maxZ = Math.max(-1, ...layout.tiles.map((t) => t.z));
  return {
    tiles: layout.tiles.map((t) => (t.key === key ? { ...t, z: maxZ + 1 } : t)),
  };
}

/** Push a tile behind everything else (แสดงด้านหลัง). */
export function sendToBack(layout: BoardLayout, key: string): BoardLayout {
  const minZ = Math.min(1, ...layout.tiles.map((t) => t.z));
  return {
    tiles: layout.tiles.map((t) => (t.key === key ? { ...t, z: minZ - 1 } : t)),
  };
}

/** Canvas height that fits every tile (for the container element). */
export function boardHeight(layout: BoardLayout, min = 360): number {
  return Math.max(min, ...layout.tiles.map((t) => t.y + t.h + 24));
}
