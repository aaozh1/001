// Import parsing — turn pasted/CSV/xlsx tabular data into spec items. Pure +
// unit-tested; the xlsx binary read (exceljs) and DB writes live elsewhere.

export type SpecField = "code" | "zone" | "category" | "qty" | "qtyUnit";
export const SPEC_FIELDS: SpecField[] = ["code", "zone", "category", "qty", "qtyUnit"];

/** field → column index in the source table. `code` is required to import. */
export type ColumnMapping = Partial<Record<SpecField, number>>;

export interface ParsedItem {
  code: string;
  zone: string;
  category: string;
  qty: string;
  qtyUnit: string;
}

// Header aliases per field (TH + EN), matched case-insensitively.
const ALIASES: Record<SpecField, string[]> = {
  code: ["code", "รหัส", "รหัสตำแหน่ง", "no", "no.", "ลำดับ", "item", "รายการ"],
  zone: ["zone", "ตำแหน่ง", "โซน", "location", "พื้นที่", "บริเวณ", "ห้อง"],
  category: ["category", "หมวด", "หมวดหมู่", "ประเภท", "type", "ตระกูล", "กลุ่ม"],
  qty: ["qty", "quantity", "ปริมาณ", "จำนวน", "amount"],
  qtyUnit: ["unit", "units", "หน่วย", "หน่วยนับ", "uom"],
};

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}

const ALIAS_LOOKUP: Record<string, SpecField> = {};
for (const field of SPEC_FIELDS) {
  for (const a of ALIASES[field]) ALIAS_LOOKUP[norm(a)] = field;
}

export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  if (firstLine.includes("\t")) return "\t";
  if (firstLine.includes(",")) return ",";
  return "\t";
}

/** Parse delimited text (auto tab/comma) into a grid, honoring "quoted" cells. */
export function parseDelimited(text: string, delimiter?: string): string[][] {
  const delim = delimiter ?? detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === delim) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += c;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  // Drop fully-empty rows.
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

/** Auto-map columns from a header row by matching TH/EN aliases. */
export function detectColumns(header: readonly string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  header.forEach((cell, idx) => {
    const field = ALIAS_LOOKUP[norm(cell)];
    if (field && mapping[field] === undefined) mapping[field] = idx;
  });
  return mapping;
}

/** A mapping is usable only if it locates the required `code` column. */
export function isValidMapping(mapping: ColumnMapping): boolean {
  return mapping.code !== undefined;
}

function at(row: readonly string[], idx: number | undefined): string {
  return idx === undefined ? "" : (row[idx] ?? "").trim();
}

/** Turn data rows into spec items via the mapping; rows with no code are skipped. */
export function rowsToItems(
  dataRows: readonly (readonly string[])[],
  mapping: ColumnMapping,
): ParsedItem[] {
  const items: ParsedItem[] = [];
  for (const row of dataRows) {
    const code = at(row, mapping.code);
    if (!code) continue;
    items.push({
      code,
      zone: at(row, mapping.zone),
      category: at(row, mapping.category),
      qty: at(row, mapping.qty),
      qtyUnit: at(row, mapping.qtyUnit),
    });
  }
  return items;
}

/** Stable key for a header layout, used to remember its mapping. */
export function fingerprintHeader(header: readonly string[]): string {
  return header.map(norm).join("|");
}
