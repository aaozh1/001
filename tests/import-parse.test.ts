import { describe, it, expect } from "vitest";
import {
  detectColumns,
  detectDelimiter,
  fingerprintHeader,
  isValidMapping,
  parseDelimited,
  rowsToItems,
} from "@/lib/import/parse";

describe("parseDelimited", () => {
  it("parses TSV (clipboard paste)", () => {
    expect(parseDelimited("a\tb\tc\n1\t2\t3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("parses CSV with quoted fields containing commas and quotes", () => {
    const csv = 'code,zone\n"FL-01","พื้น, ห้องนั่งเล่น"\n"WL-01","ผนัง ""เปียก"""';
    expect(parseDelimited(csv)).toEqual([
      ["code", "zone"],
      ["FL-01", "พื้น, ห้องนั่งเล่น"],
      ["WL-01", 'ผนัง "เปียก"'],
    ]);
  });

  it("drops fully-empty rows and handles CRLF", () => {
    expect(parseDelimited("a,b\r\n\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("detects the delimiter", () => {
    expect(detectDelimiter("a\tb")).toBe("\t");
    expect(detectDelimiter("a,b")).toBe(",");
  });
});

describe("detectColumns", () => {
  it("maps Thai headers", () => {
    expect(detectColumns(["รหัส", "ตำแหน่ง", "หมวด", "ปริมาณ", "หน่วย"])).toEqual({
      code: 0,
      zone: 1,
      category: 2,
      qty: 3,
      qtyUnit: 4,
    });
  });

  it("maps English headers (case-insensitive, spaced)", () => {
    expect(detectColumns(["Code", "ZONE", " Category ", "Qty", "Unit"])).toEqual({
      code: 0,
      zone: 1,
      category: 2,
      qty: 3,
      qtyUnit: 4,
    });
  });

  it("ignores unknown columns and keeps the first match per field", () => {
    expect(detectColumns(["รหัส", "note", "code"])).toEqual({ code: 0 });
  });
});

describe("isValidMapping", () => {
  it("requires the code column", () => {
    expect(isValidMapping({ code: 0 })).toBe(true);
    expect(isValidMapping({ zone: 1 })).toBe(false);
    expect(isValidMapping({})).toBe(false);
  });
});

describe("rowsToItems", () => {
  const mapping = { code: 0, zone: 1, qty: 2, qtyUnit: 3 };
  it("maps fields and trims", () => {
    expect(rowsToItems([[" FL-01 ", "พื้น", "48", "ตร.ม."]], mapping)).toEqual([
      { code: "FL-01", zone: "พื้น", category: "", qty: "48", qtyUnit: "ตร.ม." },
    ]);
  });
  it("skips rows without a code", () => {
    expect(rowsToItems([["", "x", "1", "u"], ["A", "y", "2", "u"]], mapping)).toHaveLength(1);
  });
});

describe("fingerprintHeader", () => {
  it("is stable across case/space differences", () => {
    expect(fingerprintHeader(["Code", " zone "])).toBe(
      fingerprintHeader(["code", "ZONE"]),
    );
  });
});
