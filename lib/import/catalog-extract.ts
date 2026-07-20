// Seller catalog import — pure, unit-tested extraction logic.
//
// Two input paths converge on the same editable draft rows:
//  1. TABULAR (.xlsx/.csv/paste): header alias detection → mapped rows.
//  2. FREE TEXT (PDF catalog / material sheet): heuristic extraction — price
//     lines anchor a product; the nearest name-like line above becomes the
//     name; model/size/cert/unit are pattern-matched around the anchor.
//
// Extraction only PROPOSES rows — the seller reviews/edits everything before
// anything is saved, and saves are always DRAFTS (never auto-published).

export interface MaterialDraftRow {
  nameTh: string;
  nameEn: string;
  brand: string;
  model: string;
  sku: string;
  price: string;
  unit: string;
  size: string;
  color: string;
  cert: string;
  leadTime: string;
  warranty: string;
  note: string;
}

export const EMPTY_DRAFT: MaterialDraftRow = {
  nameTh: "",
  nameEn: "",
  brand: "",
  model: "",
  sku: "",
  price: "",
  unit: "",
  size: "",
  color: "",
  cert: "",
  leadTime: "",
  warranty: "",
  note: "",
};

// ── 1) Tabular material sheets ─────────────────────────────────────────

export type MaterialField = keyof MaterialDraftRow;
export const MATERIAL_FIELDS: MaterialField[] = [
  "nameTh",
  "nameEn",
  "brand",
  "model",
  "sku",
  "price",
  "unit",
  "size",
  "color",
  "cert",
  "leadTime",
  "warranty",
  "note",
];

const FIELD_ALIASES: Record<MaterialField, string[]> = {
  nameTh: ["ชื่อ", "ชื่อสินค้า", "ชื่อวัสดุ", "สินค้า", "วัสดุ", "รายการ", "name", "product", "productname", "item", "description"],
  nameEn: ["nameen", "ชื่ออังกฤษ", "englishname", "producten"],
  brand: ["แบรนด์", "ยี่ห้อ", "brand", "ตรา"],
  model: ["รุ่น", "model", "series", "ซีรีส์", "รุ่นสินค้า"],
  sku: ["sku", "รหัส", "รหัสสินค้า", "code", "itemcode", "productcode", "บาร์โค้ด", "barcode"],
  price: ["ราคา", "price", "ราคาขาย", "ราคา/หน่วย", "unitprice", "บาท", "thb"],
  unit: ["หน่วย", "unit", "uom", "หน่วยขาย", "หน่วยนับ"],
  size: ["ขนาด", "size", "dimension", "มิติ", "สเปคขนาด", "ขนาดสินค้า"],
  color: ["สี", "color", "colour", "เฉดสี"],
  cert: ["มาตรฐาน", "ใบรับรอง", "cert", "certificate", "standard", "มอก", "มอก."],
  leadTime: ["ระยะส่ง", "ระยะเวลาส่ง", "leadtime", "lead", "ส่งของ", "จัดส่ง"],
  warranty: ["รับประกัน", "ประกัน", "warranty"],
  note: ["หมายเหตุ", "note", "remark", "รายละเอียด", "detail"],
};

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "").replace(/\.$/, "");
}

const ALIAS_LOOKUP = new Map<string, MaterialField>();
for (const field of MATERIAL_FIELDS) {
  for (const a of FIELD_ALIASES[field]) ALIAS_LOOKUP.set(norm(a), field);
}

export type MaterialColumnMapping = Partial<Record<MaterialField, number>>;

/** Auto-map a header row to material fields via TH/EN aliases. */
export function detectMaterialColumns(header: readonly string[]): MaterialColumnMapping {
  const mapping: MaterialColumnMapping = {};
  header.forEach((cell, idx) => {
    const field = ALIAS_LOOKUP.get(norm(cell));
    if (field && mapping[field] === undefined) mapping[field] = idx;
  });
  return mapping;
}

/** Usable when we can locate a product name column. */
export function isValidMaterialMapping(mapping: MaterialColumnMapping): boolean {
  return mapping.nameTh !== undefined;
}

function at(row: readonly string[], idx: number | undefined): string {
  return idx === undefined ? "" : (row[idx] ?? "").trim();
}

/** Data rows → draft rows via the mapping; rows without a name are skipped. */
export function gridToDrafts(
  dataRows: readonly (readonly string[])[],
  mapping: MaterialColumnMapping,
): MaterialDraftRow[] {
  const drafts: MaterialDraftRow[] = [];
  for (const row of dataRows) {
    const nameTh = at(row, mapping.nameTh);
    if (!nameTh) continue;
    drafts.push({
      nameTh: nameTh.slice(0, 160),
      nameEn: at(row, mapping.nameEn).slice(0, 160),
      brand: at(row, mapping.brand).slice(0, 80),
      model: at(row, mapping.model).slice(0, 120),
      sku: at(row, mapping.sku).slice(0, 80),
      price: cleanPrice(at(row, mapping.price)),
      unit: at(row, mapping.unit).slice(0, 40),
      size: at(row, mapping.size).slice(0, 120),
      color: at(row, mapping.color).slice(0, 120),
      cert: at(row, mapping.cert).slice(0, 160),
      leadTime: at(row, mapping.leadTime).slice(0, 120),
      warranty: at(row, mapping.warranty).slice(0, 120),
      note: at(row, mapping.note).slice(0, 500),
    });
  }
  return drafts;
}

/** "฿1,290.50 / ตร.ม." → "1290.50"; junk → "". */
export function cleanPrice(raw: string): string {
  const m = raw.replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  if (!m) return "";
  const n = Number(m[0]);
  return Number.isFinite(n) && n >= 0 ? m[0] : "";
}

// ── 2) Free-text catalogs (PDF text layer) ─────────────────────────────

const UNIT_WORDS = [
  "ตร.ม.", "ตารางเมตร", "ตร.ฟุต", "แผ่น", "ก้อน", "ชุด", "ม้วน", "กก.", "ตัน",
  "เมตร", "ม.", "ชิ้น", "กล่อง", "ถัง", "แกลลอน", "ลิตร", "ล.", "จุด", "อัน",
  "sqm", "m2", "pc", "pcs", "set", "roll", "sheet", "box",
];

// Price anchors: "890 บาท", "฿1,250", "ราคา 620/ตร.ม.", "THB 450", "1,850.-"
const PRICE_RE =
  /(?:฿|THB\s*|ราคา\s*|บาท\s*)?([\d,]{2,}(?:\.\d{1,2})?)(?:\s*(?:\.-|บาท|฿|THB))?(?:\s*[/／]\s*([^\s,;]{1,12}))?/;
const PRICE_HINT_RE = /฿|บาท|THB|ราคา|\.-|\/\s*(?:ตร\.ม\.|แผ่น|ก้อน|ชุด|ม้วน|เมตร|ม\.|ชิ้น|กล่อง|ถัง|sqm|pc)/i;

const SIZE_RE =
  /(\d+(?:\.\d+)?\s*[x×]\s*\d+(?:\.\d+)?(?:\s*[x×]\s*\d+(?:\.\d+)?)?\s*(?:มม\.?|ซม\.?|ม\.|mm|cm|m)?|หนา\s*\d+(?:\.\d+)?\s*(?:มม\.?|ซม\.?|mm|cm))/i;
const CERT_RE = /(มอก\.\s*[\d-]+|FSC|FloorScore|GREENGUARD|ฉลากเขียว|ISO\s*\d+|ASTM\s*[A-Z]?\d+|JIS\s*[A-Z]?\d*|AAMA\s*\d+|BS\s*\d+)/i;
// Model-ish token: letters+digits mix (AquaLock 620, SS400, H-Beam 200) or a
// quoted series name.
const MODEL_RE = /\b([A-Z][A-Za-z]+[- ]?\d{2,4}|[A-Z]{2,}[- ]\w+|[A-Z][a-z]+[A-Z]\w+)\b/;
const LEAD_RE = /(?:ส่ง(?:ของ|มอบ)?|จัดส่ง|lead\s*time)[^\d]{0,10}(\d+(?:\s*[-–]\s*\d+)?\s*(?:วัน|สัปดาห์|เดือน|days?|weeks?))/i;
const WARRANTY_RE = /(?:รับประกัน|ประกัน|warranty)[^\d]{0,10}(\d+\s*(?:ปี|เดือน|years?|months?))/i;

export interface ExtractedCandidate extends MaterialDraftRow {
  /** 0-100 — how product-like this block looked (for UI ordering/badging). */
  confidence: number;
  /** The source lines the candidate came from (shown to the seller). */
  source: string;
}

function isNameLike(line: string): boolean {
  const s = line.trim();
  if (s.length < 3 || s.length > 90) return false;
  if (PRICE_HINT_RE.test(s) && PRICE_RE.test(s)) return false;
  // Mostly-numeric or table-noise lines are not names.
  const digits = (s.match(/\d/g) ?? []).length;
  if (digits > s.length * 0.4) return false;
  if (/^(หน้า|page|www\.|http|โทร|tel|fax|email|e-mail)/i.test(s)) return false;
  return /[ก-๙A-Za-z]{3,}/.test(s);
}

// Lines dominated by spec vocabulary are attributes, not product names — used
// to PREFER a clean title when several lines above the price qualify.
const SPEC_WORD_RE =
  /มอก|รับประกัน|ประกัน|ขนาด|หนา\s*\d|กันน้ำ|กันลื่น|ผิว|ทนไฟ|กันชื้น|NRC|SRI|CRI|VOC|ISO|ASTM|JIS|FloorScore|FSC|Martindale|MPa|kg\/m/i;

function specness(line: string): number {
  let n = 0;
  if (SPEC_WORD_RE.test(line)) n += 2;
  if (SIZE_RE.test(line)) n += 1;
  if (CERT_RE.test(line)) n += 1;
  return n;
}

/**
 * Heuristic product extraction from catalog text. A line containing a price
 * anchors a candidate; the closest name-like line in the 3 lines above names
 * it; specs are pattern-matched from the surrounding block (±2 lines).
 */
export function extractCandidates(text: string, maxRows = 100): ExtractedCandidate[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim());
  const out: ExtractedCandidate[] = [];
  const usedNames = new Set<number>();

  for (let i = 0; i < lines.length && out.length < maxRows; i++) {
    const line = lines[i];
    if (!line || !PRICE_HINT_RE.test(line)) continue;
    const priceMatch = line.match(PRICE_RE);
    if (!priceMatch) continue;
    const price = cleanPrice(priceMatch[1] ?? "");
    if (!price || Number(price) < 1) continue;

    // Name: this line's leading text before the price, else nearest name-like
    // line above (unclaimed).
    let name = "";
    let nameIdx = -1;
    const before = line.slice(0, line.indexOf(priceMatch[0])).trim().replace(/[·|:–-]\s*$/, "").trim();
    if (isNameLike(before)) {
      name = before;
    } else {
      // Best name-like line in the 4 lines above: cleanest (least spec-like)
      // wins; on a tie the closer line wins.
      let bestScore = Infinity;
      for (let k = i - 1; k >= Math.max(0, i - 4); k--) {
        if (usedNames.has(k) || !isNameLike(lines[k])) continue;
        const score = specness(lines[k]);
        if (score < bestScore) {
          bestScore = score;
          name = lines[k];
          nameIdx = k;
        }
      }
    }
    if (!name) continue;
    if (nameIdx >= 0) usedNames.add(nameIdx);

    const block = lines.slice(Math.max(0, i - 2), i + 3).join(" \n ");
    const unitFromPrice = (priceMatch[2] ?? "").trim();
    let unit =
      UNIT_WORDS.find((u) => norm(unitFromPrice) === norm(u)) ??
      (unitFromPrice.length > 0 && unitFromPrice.length <= 12 ? unitFromPrice : "");
    if (!unit) {
      unit = UNIT_WORDS.find((u) => block.includes(`/${u}`) || block.includes(`/ ${u}`)) ?? "";
    }

    const model = (name.match(MODEL_RE) ?? block.match(MODEL_RE))?.[1] ?? "";
    const size = block.match(SIZE_RE)?.[1] ?? "";
    const cert = block.match(CERT_RE)?.[1] ?? "";
    const leadTime = block.match(LEAD_RE)?.[1] ?? "";
    const warranty = block.match(WARRANTY_RE)?.[1] ?? "";

    let confidence = 40;
    if (unit) confidence += 15;
    if (model) confidence += 15;
    if (size) confidence += 10;
    if (cert) confidence += 10;
    if (leadTime || warranty) confidence += 10;

    out.push({
      ...EMPTY_DRAFT,
      nameTh: name.slice(0, 160),
      model: model.slice(0, 120),
      price,
      unit: unit.slice(0, 40),
      size: size.slice(0, 120),
      cert: cert.slice(0, 160),
      leadTime: leadTime.slice(0, 120),
      warranty: warranty.slice(0, 120),
      confidence: Math.min(100, confidence),
      source: [nameIdx >= 0 ? lines[nameIdx] : null, line].filter(Boolean).join(" ⏎ ").slice(0, 300),
    });
  }
  return out;
}
