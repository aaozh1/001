import { describe, it, expect } from "vitest";
import { boardOrder, optionEmphasis } from "@/lib/spec/board";

describe("optionEmphasis", () => {
  it("confirmed → primary, else faded", () => {
    expect(optionEmphasis({ materialId: "a", isConfirmed: true })).toBe("primary");
    expect(optionEmphasis({ materialId: "b", isConfirmed: false })).toBe("faded");
  });
});

describe("boardOrder", () => {
  it("puts the confirmed option first, keeps the rest stable", () => {
    const opts = [
      { materialId: "a", isConfirmed: false },
      { materialId: "b", isConfirmed: false },
      { materialId: "c", isConfirmed: true },
    ];
    expect(boardOrder(opts).map((o) => o.materialId)).toEqual(["c", "a", "b"]);
  });

  it("is a no-op when nothing is confirmed and does not mutate input", () => {
    const opts = [
      { materialId: "a", isConfirmed: false },
      { materialId: "b", isConfirmed: false },
    ];
    const copy = [...opts];
    expect(boardOrder(opts).map((o) => o.materialId)).toEqual(["a", "b"]);
    expect(opts).toEqual(copy);
  });
});

// ── Free-canvas layout helpers (drag/resize/z-order board) ─────────────
import {
  BOARD_MAX_X,
  TILE_MAX,
  TILE_MIN,
  boardHeight,
  bringToFront,
  defaultTile,
  normalizeBoardLayout,
  sendToBack,
  type BoardLayout,
} from "@/lib/spec/board";

describe("normalizeBoardLayout", () => {
  it("creates default grid tiles for unknown keys", () => {
    const l = normalizeBoardLayout(null, ["a", "b", "c"]);
    expect(l.tiles).toHaveLength(3);
    expect(l.tiles[0]).toEqual(defaultTile("a", 0));
    // Tiles land on distinct positions.
    const pos = new Set(l.tiles.map((t) => `${t.x},${t.y}`));
    expect(pos.size).toBe(3);
  });

  it("keeps stored geometry, drops removed keys, clamps junk", () => {
    const stored: BoardLayout = {
      tiles: [
        { key: "a", x: 50, y: 60, w: 200, h: 180, z: 5 },
        { key: "gone", x: 0, y: 0, w: 100, h: 100, z: 1 },
        { key: "b", x: -999, y: 20, w: 9999, h: 10, z: 2 },
      ],
    };
    const l = normalizeBoardLayout(stored, ["a", "b"]);
    expect(l.tiles.map((t) => t.key).sort()).toEqual(["a", "b"]);
    const a = l.tiles.find((t) => t.key === "a")!;
    expect({ x: a.x, y: a.y, w: a.w, h: a.h }).toEqual({ x: 50, y: 60, w: 200, h: 180 });
    const b = l.tiles.find((t) => t.key === "b")!;
    expect(b.x).toBe(0);
    expect(b.x).toBeLessThanOrEqual(BOARD_MAX_X);
    expect(b.w).toBe(TILE_MAX);
    expect(b.h).toBe(TILE_MIN);
  });

  it("re-packs z into 0..n-1 keeping relative order", () => {
    const stored: BoardLayout = {
      tiles: [
        { key: "a", x: 0, y: 0, w: 100, h: 100, z: 90 },
        { key: "b", x: 0, y: 0, w: 100, h: 100, z: -4 },
      ],
    };
    const l = normalizeBoardLayout(stored, ["a", "b"]);
    expect(l.tiles.find((t) => t.key === "b")!.z).toBe(0);
    expect(l.tiles.find((t) => t.key === "a")!.z).toBe(1);
  });
});

describe("z-order controls", () => {
  const base: BoardLayout = normalizeBoardLayout(null, ["a", "b", "c"]);

  it("bringToFront puts the tile above every other", () => {
    const l = bringToFront(base, "a");
    const a = l.tiles.find((t) => t.key === "a")!;
    expect(l.tiles.every((t) => t.key === "a" || t.z < a.z)).toBe(true);
  });

  it("sendToBack puts the tile below every other", () => {
    const l = sendToBack(base, "c");
    const c = l.tiles.find((t) => t.key === "c")!;
    expect(l.tiles.every((t) => t.key === "c" || t.z > c.z)).toBe(true);
  });
});

describe("boardHeight", () => {
  it("fits the lowest tile with padding and respects the minimum", () => {
    const l: BoardLayout = { tiles: [{ key: "a", x: 0, y: 500, w: 100, h: 120, z: 0 }] };
    expect(boardHeight(l)).toBe(500 + 120 + 24);
    expect(boardHeight({ tiles: [] })).toBe(360);
  });
});
