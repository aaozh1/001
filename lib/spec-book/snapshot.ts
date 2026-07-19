// A Spec Book version freezes the whole schedule at export time so an old PDF
// stays faithful after edits (see SpecBook.snapshot). These builders are pure +
// unit-tested; the DB/PDF plumbing lives in service.ts / pdf.ts.

export interface SnapshotOption {
  name: string;
  nameEn: string | null;
  brand: string | null;
  model: string | null;
  sku: string | null;
  sellerName: string | null;
  price: string | null;
  unit: string | null;
  specTh: string | null;
  specEn: string | null;
  cert: string | null;
  leadTime: string | null;
  moq: string | null;
  warranty: string | null;
  noteTh: string | null;
  noteEn: string | null;
  swatchHex: string | null;
  isConfirmed: boolean;
}

export interface SnapshotItem {
  code: string;
  zone: string | null;
  category: string | null;
  qty: string | null;
  qtyUnit: string | null;
  options: SnapshotOption[];
}

export interface SpecBookSnapshot {
  projectName: string;
  buildingType: string | null;
  generatedAt: string;
  items: SnapshotItem[];
}

// Full material record needed to freeze an option's manufacturer info.
export interface MaterialFull {
  nameTh: string;
  nameEn: string | null;
  brand: string | null;
  model: string | null;
  sku: string | null;
  sellerName: string | null;
  price: string | null;
  unit: string | null;
  specTh: string | null;
  specEn: string | null;
  cert: string | null;
  leadTime: string | null;
  moq: string | null;
  warranty: string | null;
  noteTh: string | null;
  noteEn: string | null;
  swatchHex: string | null;
}

export interface SnapshotSourceItem {
  code: string;
  zone: string | null;
  category: string | null;
  qty: string | null;
  qtyUnit: string | null;
  options: { materialId: string; isConfirmed: boolean }[];
}

/** Next version number given the versions already stored for a project. */
export function nextVersion(existing: readonly number[]): number {
  return existing.length === 0 ? 1 : Math.max(...existing) + 1;
}

/** Freeze the schedule into a self-contained snapshot (confirmed option first). */
export function buildSpecBookSnapshot(
  project: { name: string; buildingType: string | null },
  items: readonly SnapshotSourceItem[],
  materials: ReadonlyMap<string, MaterialFull>,
  generatedAt: string,
): SpecBookSnapshot {
  return {
    projectName: project.name,
    buildingType: project.buildingType,
    generatedAt,
    items: items.map((item) => ({
      code: item.code,
      zone: item.zone,
      category: item.category,
      qty: item.qty,
      qtyUnit: item.qtyUnit,
      options: [...item.options]
        .sort((a, b) => Number(b.isConfirmed) - Number(a.isConfirmed))
        .map((o) => {
          const m = materials.get(o.materialId);
          return {
            name: m?.nameTh ?? "—",
            nameEn: m?.nameEn ?? null,
            brand: m?.brand ?? null,
            model: m?.model ?? null,
            sku: m?.sku ?? null,
            sellerName: m?.sellerName ?? null,
            price: m?.price ?? null,
            unit: m?.unit ?? null,
            specTh: m?.specTh ?? null,
            specEn: m?.specEn ?? null,
            cert: m?.cert ?? null,
            leadTime: m?.leadTime ?? null,
            moq: m?.moq ?? null,
            warranty: m?.warranty ?? null,
            noteTh: m?.noteTh ?? null,
            noteEn: m?.noteEn ?? null,
            swatchHex: m?.swatchHex ?? null,
            isConfirmed: o.isConfirmed,
          };
        }),
    })),
  };
}
