import { describe, it, expect } from "vitest";
import {
  buildSpecBookSnapshot,
  nextVersion,
  type MaterialFull,
} from "@/lib/spec-book/snapshot";

describe("nextVersion", () => {
  it("starts at 1, then increments past the max", () => {
    expect(nextVersion([])).toBe(1);
    expect(nextVersion([1])).toBe(2);
    expect(nextVersion([1, 2, 5])).toBe(6);
    expect(nextVersion([3, 1, 2])).toBe(4);
  });
});

const mat = (o: Partial<MaterialFull>): MaterialFull => ({
  nameTh: "วัสดุ",
  nameEn: null,
  brand: null,
  model: null,
  sku: null,
  sellerName: null,
  price: null,
  unit: null,
  specTh: null,
  specEn: null,
  cert: null,
  leadTime: null,
  moq: null,
  warranty: null,
  noteTh: null,
  noteEn: null,
  swatchHex: null,
  ...o,
});

describe("buildSpecBookSnapshot", () => {
  const materials = new Map<string, MaterialFull>([
    ["a", mat({ nameTh: "กระเบื้อง", brand: "COTTO", noteTh: "เว้นร่อง 2 มม.", sellerName: "Grand" })],
    ["b", mat({ nameTh: "หินขัด", brand: "Siam", noteTh: "หล่อในที่" })],
  ]);

  const snap = buildSpecBookSnapshot(
    { name: "บ้านหัวหิน", buildingType: "บ้านเดี่ยว" },
    [
      {
        code: "FL-01",
        zone: "พื้น",
        category: "กระเบื้อง",
        qty: "48",
        qtyUnit: "ตร.ม.",
        options: [
          { materialId: "a", isConfirmed: false },
          { materialId: "b", isConfirmed: true },
        ],
      },
    ],
    materials,
    "19 ก.ค. 2569",
  );

  it("carries project + generation metadata", () => {
    expect(snap.projectName).toBe("บ้านหัวหิน");
    expect(snap.buildingType).toBe("บ้านเดี่ยว");
    expect(snap.generatedAt).toBe("19 ก.ค. 2569");
  });

  it("puts the confirmed option first", () => {
    expect(snap.items[0].options[0].isConfirmed).toBe(true);
    expect(snap.items[0].options[0].brand).toBe("Siam");
  });

  it("freezes manufacturer info + notes per option", () => {
    const cotto = snap.items[0].options.find((o) => o.brand === "COTTO")!;
    expect(cotto.name).toBe("กระเบื้อง");
    expect(cotto.sellerName).toBe("Grand");
    expect(cotto.noteTh).toBe("เว้นร่อง 2 มม.");
  });

  it("tolerates a missing material (renders a placeholder)", () => {
    const s = buildSpecBookSnapshot(
      { name: "x", buildingType: null },
      [{ code: "C", zone: null, category: null, qty: null, qtyUnit: null, options: [{ materialId: "gone", isConfirmed: false }] }],
      materials,
      "d",
    );
    expect(s.items[0].options[0].name).toBe("—");
  });
});
