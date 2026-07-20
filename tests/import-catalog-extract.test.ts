import { describe, expect, it } from "vitest";
import {
  cleanPrice,
  detectMaterialColumns,
  extractCandidates,
  gridToDrafts,
  isValidMaterialMapping,
} from "@/lib/import/catalog-extract";

describe("detectMaterialColumns", () => {
  it("maps Thai + English headers", () => {
    const m = detectMaterialColumns([
      "รหัสสินค้า", "ชื่อสินค้า", "แบรนด์", "รุ่น", "ราคา", "หน่วย", "ขนาด", "มอก.",
    ]);
    expect(m.sku).toBe(0);
    expect(m.nameTh).toBe(1);
    expect(m.brand).toBe(2);
    expect(m.model).toBe(3);
    expect(m.price).toBe(4);
    expect(m.unit).toBe(5);
    expect(m.size).toBe(6);
    expect(m.cert).toBe(7);
    expect(isValidMaterialMapping(m)).toBe(true);
  });

  it("English sheet works and name is required", () => {
    const m = detectMaterialColumns(["Product Name", "Brand", "Price", "Unit"]);
    expect(m.nameTh).toBe(0);
    expect(isValidMaterialMapping(detectMaterialColumns(["Brand", "Price"]))).toBe(false);
  });
});

describe("gridToDrafts", () => {
  it("maps rows, cleans prices, skips nameless rows", () => {
    const mapping = detectMaterialColumns(["ชื่อสินค้า", "ราคา", "หน่วย"]);
    const drafts = gridToDrafts(
      [
        ["กระเบื้องพอร์ซเลน 60x60", "฿1,290.50", "ตร.ม."],
        ["", "999", "ชุด"],
        ["อิฐมอญ", "ราคา 12 บาท", "ก้อน"],
      ],
      mapping,
    );
    expect(drafts).toHaveLength(2);
    expect(drafts[0].price).toBe("1290.50");
    expect(drafts[1].price).toBe("12");
    expect(drafts[1].unit).toBe("ก้อน");
  });
});

describe("cleanPrice", () => {
  it("handles currency symbols, commas and junk", () => {
    expect(cleanPrice("฿2,450")).toBe("2450");
    expect(cleanPrice("1,850.- ")).toBe("1850");
    expect(cleanPrice("THB 620/ตร.ม.")).toBe("620");
    expect(cleanPrice("โทรสอบถาม")).toBe("");
  });
});

describe("extractCandidates (PDF text)", () => {
  const CATALOG = `
COTTO Tile Collection 2026
www.example.com  โทร 02-000-0000

กระเบื้องพอร์ซเลน รุ่น Arctic 600
ขนาด 60×60 ซม. ผิว Matt กันลื่น R9
มอก. 2508 รับประกัน 10 ปี
ราคา 890 บาท/ตร.ม. จัดส่งภายใน 7 วัน

พื้น SPC คลิกล็อก AquaLock 620
หนา 5 มม. กันน้ำ 100% FloorScore
฿620/ตร.ม.

หน้า 3
`;

  it("finds both products with their facts", () => {
    const rows = extractCandidates(CATALOG);
    expect(rows).toHaveLength(2);

    const tile = rows[0];
    expect(tile.nameTh).toContain("กระเบื้องพอร์ซเลน");
    expect(tile.price).toBe("890");
    expect(tile.unit).toBe("ตร.ม.");
    expect(tile.cert).toContain("มอก.");
    expect(tile.warranty).toContain("10 ปี");
    expect(tile.leadTime).toContain("7 วัน");

    const spc = rows[1];
    expect(spc.nameTh).toContain("SPC");
    expect(spc.price).toBe("620");
    expect(spc.model).toContain("AquaLock");
    expect(spc.cert).toBe("FloorScore");
    expect(spc.size.toLowerCase()).toContain("หนา 5 มม.".toLowerCase());
  });

  it("skips page furniture (urls, phone, page numbers)", () => {
    const rows = extractCandidates(CATALOG);
    for (const r of rows) {
      expect(r.nameTh).not.toMatch(/www|โทร|หน้า/);
    }
  });

  it("scores richer blocks higher", () => {
    const rows = extractCandidates(CATALOG);
    expect(rows[0].confidence).toBeGreaterThanOrEqual(rows[1].confidence - 15);
    for (const r of rows) expect(r.confidence).toBeGreaterThanOrEqual(40);
  });

  it("returns nothing for non-product text", () => {
    expect(extractCandidates("บริษัทของเราก่อตั้งเมื่อปี 2540\nมีพนักงานกว่า 100 คน")).toEqual([]);
  });

  it("caps the number of rows", () => {
    const many = Array.from({ length: 300 }, (_, i) => `สินค้า ตัวอย่าง ${i}\nราคา ${100 + i} บาท/ชิ้น`).join("\n");
    expect(extractCandidates(many, 50)).toHaveLength(50);
  });
});
