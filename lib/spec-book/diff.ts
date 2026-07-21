// 5G version diff — pure + unit-tested. Compares two Spec Book snapshots by
// item code and classifies each line: added / removed / changed (option
// palette differs) / confirmed (a material became confirmed).

import type { SpecBookSnapshot } from "./snapshot";

export interface DiffSummary {
  added: number;
  removed: number;
  changed: number;
  confirmed: number;
}

function optionSignature(item: SpecBookSnapshot["items"][number]): string {
  return item.options
    .map((o) => `${o.name}|${o.brand ?? ""}|${o.model ?? ""}`)
    .sort()
    .join("∥");
}

function confirmedName(item: SpecBookSnapshot["items"][number]): string | null {
  const c = item.options.find((o) => o.isConfirmed);
  return c ? `${c.name}|${c.brand ?? ""}` : null;
}

export function diffSnapshots(
  prev: SpecBookSnapshot | null,
  next: SpecBookSnapshot,
): DiffSummary {
  const summary: DiffSummary = { added: 0, removed: 0, changed: 0, confirmed: 0 };
  const prevByCode = new Map((prev?.items ?? []).map((i) => [i.code, i]));
  const nextCodes = new Set(next.items.map((i) => i.code));

  for (const item of next.items) {
    const before = prevByCode.get(item.code);
    if (!before) {
      summary.added++;
      continue;
    }
    const beforeConfirmed = confirmedName(before);
    const nowConfirmed = confirmedName(item);
    if (nowConfirmed && nowConfirmed !== beforeConfirmed) summary.confirmed++;
    else if (optionSignature(before) !== optionSignature(item)) summary.changed++;
  }
  for (const code of prevByCode.keys()) {
    if (!nextCodes.has(code)) summary.removed++;
  }
  return summary;
}
