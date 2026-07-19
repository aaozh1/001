// Pure rules for a spec line's material options (unit-tested). A SpecItem holds
// up to MAX_SPEC_OPTIONS candidate materials before one is confirmed; RFQs later
// go out to all options at once (DATA_MODEL / DECISIONS: "เก็บตัวเลือกไว้ก่อน
// ค่อยตัด").

export const MAX_SPEC_OPTIONS = 4;

/** Is there room for another option on an item that already has `count`? */
export function canAddOption(count: number): boolean {
  return count < MAX_SPEC_OPTIONS;
}

/** Slots left before hitting the cap. */
export function remainingOptionSlots(count: number): number {
  return Math.max(0, MAX_SPEC_OPTIONS - count);
}

/** A material can only be confirmed if it is one of the item's options. */
export function isConfirmable(
  optionMaterialIds: readonly string[],
  materialId: string,
): boolean {
  return optionMaterialIds.includes(materialId);
}
