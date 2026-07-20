import type { SpecStatus } from "@/lib/spec/status";

export interface OptionView {
  materialId: string;
  name: string;
  brand: string | null;
  model: string | null;
  category: string;
  swatchHex: string | null;
  isConfirmed: boolean;
  // Compare facts (เทียบตัวเลือกแบบเห็นรายละเอียด)
  price: string | null;
  unit: string | null;
  leadTime: string | null;
  warranty: string | null;
  cert: string | null;
}

export interface RfqQuoteView {
  quoteId: string;
  sellerOrgId: string;
  sellerName: string;
  pricePerUnit: string;
  projectDiscount: string | null;
  leadTime: string | null;
  paymentTerms: string | null;
  validUntil: string | null;
  includeSample: boolean;
  status: string;
}

export interface RfqView {
  state: "none" | "sent" | "quoted" | "closed";
  rfqId: string | null;
  rfqStatus: string | null;
  quotes: RfqQuoteView[];
}

export interface SpecRow {
  id: string;
  code: string;
  zone: string;
  category: string;
  qty: string;
  qtyUnit: string;
  status: SpecStatus;
  confirmedMaterialId: string | null;
  options: OptionView[];
  rfq: RfqView;
}

export const SPEC_VIEWS = ["full", "compact", "grid", "board"] as const;
export type SpecView = (typeof SPEC_VIEWS)[number];

// Optional material-data columns in the Material List (ดึงจากวัสดุที่ confirm
// หรือตัวเลือกแรก) — add/remove via the ⚙ chooser.
export const MLIST_COLS = [
  "material",
  "brand",
  "model",
  "price",
  "leadTime",
  "warranty",
  "cert",
] as const;
export type MlistCol = (typeof MLIST_COLS)[number];
export const DEFAULT_MLIST_COLS: MlistCol[] = ["material", "price"];

/** The material whose facts a row displays: confirmed first, else 1st option. */
export function rowMaterial(row: SpecRow): OptionView | null {
  return row.options.find((o) => o.isConfirmed) ?? row.options[0] ?? null;
}
