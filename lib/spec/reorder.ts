// Pure row-ordering helpers for the spec table (unit-tested). The DB stores an
// explicit SpecItem.sortOrder; these compute the new order without a database.

/** Move `id` one step up (dir -1) or down (dir +1). No-op at the boundaries. */
export function moveItem(ids: string[], id: string, dir: -1 | 1): string[] {
  const index = ids.indexOf(id);
  if (index === -1) return ids;
  const target = index + dir;
  if (target < 0 || target >= ids.length) return ids;
  const next = [...ids];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Assign contiguous sortOrder values (0..n-1) to an ordered id list. */
export function assignSortOrder(ids: string[]): { id: string; sortOrder: number }[] {
  return ids.map((id, i) => ({ id, sortOrder: i }));
}

/**
 * Validate a proposed order against the known set: it must be a permutation
 * (same members, no dupes, none missing). Guards the reorder endpoint against
 * dropped or foreign ids.
 */
export function isSamePermutation(current: string[], proposed: string[]): boolean {
  if (current.length !== proposed.length) return false;
  if (new Set(proposed).size !== proposed.length) return false;
  const set = new Set(current);
  return proposed.every((id) => set.has(id));
}
