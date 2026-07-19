// Pure helpers for the Material Board view (unit-tested). The board is a mood /
// tone grid of swatches: the confirmed material shows large ("in use"), the
// other options show faded/smaller ("pending"). See the prototype board hint.

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
 * Order an item's options for the board: the confirmed one first, the rest keep
 * their given order. Keeps the "hero" swatch leading each item's group.
 */
export function boardOrder<T extends BoardOption>(options: readonly T[]): T[] {
  return [...options].sort((a, b) => Number(b.isConfirmed) - Number(a.isConfirmed));
}
