// 5G version diff — pure + unit-tested. Compares two Spec Book snapshots by
// item code and classifies each line: added / removed / changed (option
// palette differs) / confirmed (a material became confirmed). Besides the
// counts, per-item ENTRIES power the mock's CHANGED/CONFIRMED detail rows.

import type { SpecBookSnapshot } from "./snapshot";

export interface DiffSummary {
  added: number;
  removed: number;
  changed: number;
  confirmed: number;
  entries: DiffEntry[];
}

export interface DiffEntry {
  kind: "added" | "removed" | "changed" | "confirmed";
  code: string;
  /** Line title (zone/location when present). */
  title: string | null;
  /** For confirmed/changed/removed: previous state label. */
  from: string | null;
  /** For confirmed/changed/added: current state label. */
  to: string | null;
}

type SnapItem = SpecBookSnapshot["items"][number];

function optionSignature(item: SnapItem): string {
  return item.options
    .map((o) => `${o.name}|${o.brand ?? ""}|${o.model ?? ""}`)
    .sort()
    .join("∥");
}

function confirmedName(item: SnapItem): string | null {
  const c = item.options.find((o) => o.isConfirmed);
  return c ? `${c.name}|${c.brand ?? ""}` : null;
}

function label(item: SnapItem): string | null {
  const c = item.options.find((o) => o.isConfirmed) ?? item.options[0];
  return c ? [c.name, c.brand].filter(Boolean).join(" · ") : null;
}

export function diffSnapshots(
  prev: SpecBookSnapshot | null,
  next: SpecBookSnapshot,
): DiffSummary {
  const summary: DiffSummary = { added: 0, removed: 0, changed: 0, confirmed: 0, entries: [] };
  const prevByCode = new Map((prev?.items ?? []).map((i) => [i.code, i]));
  const nextCodes = new Set(next.items.map((i) => i.code));

  for (const item of next.items) {
    const before = prevByCode.get(item.code);
    if (!before) {
      summary.added++;
      summary.entries.push({
        kind: "added",
        code: item.code,
        title: item.zone ?? null,
        from: null,
        to: label(item),
      });
      continue;
    }
    const beforeConfirmed = confirmedName(before);
    const nowConfirmed = confirmedName(item);
    if (nowConfirmed && nowConfirmed !== beforeConfirmed) {
      summary.confirmed++;
      summary.entries.push({
        kind: "confirmed",
        code: item.code,
        title: item.zone ?? null,
        from: label(before),
        to: label(item),
      });
    } else if (optionSignature(before) !== optionSignature(item)) {
      summary.changed++;
      summary.entries.push({
        kind: "changed",
        code: item.code,
        title: item.zone ?? null,
        from: label(before),
        to: label(item),
      });
    }
  }
  for (const [code, before] of prevByCode) {
    if (!nextCodes.has(code)) {
      summary.removed++;
      summary.entries.push({
        kind: "removed",
        code,
        title: before.zone ?? null,
        from: label(before),
        to: null,
      });
    }
  }
  return summary;
}
