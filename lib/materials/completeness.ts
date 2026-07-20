// Material data-completeness score — pure + unit-tested (ROADMAP 3.3).
//
// Completeness is the seller's ONLY lever on default catalog order (rule #1:
// richer data ranks better among non-matches — never money). The score also
// drives the "what's missing" hints on the product form, so sellers know
// exactly how to improve.

export interface CompletenessInput {
  nameTh: string | null;
  nameEn: string | null;
  model: string | null;
  sku: string | null;
  category: string | null;
  color: string | null;
  size: string | null;
  price: string | number | null;
  unit: string | null;
  spec: unknown;
  cert: string | null;
  leadTime: string | null;
  moq: string | null;
  warranty: string | null;
  noteTh: string | null;
  swatchHex: string | null;
  images: readonly string[];
  specsheetUrl: string | null;
}

// Weights sum to 100. Core commercial facts weigh most — they're what a
// designer needs to actually spec + RFQ the product.
const WEIGHTS: { key: keyof CompletenessInput; weight: number }[] = [
  { key: "nameTh", weight: 10 },
  { key: "category", weight: 10 },
  { key: "price", weight: 12 },
  { key: "unit", weight: 8 },
  { key: "spec", weight: 12 },
  { key: "leadTime", weight: 8 },
  { key: "moq", weight: 5 },
  { key: "warranty", weight: 5 },
  { key: "cert", weight: 5 },
  { key: "model", weight: 4 },
  { key: "sku", weight: 4 },
  { key: "nameEn", weight: 3 },
  { key: "color", weight: 3 },
  { key: "size", weight: 3 },
  { key: "swatchHex", weight: 3 },
  { key: "images", weight: 3 },
  { key: "specsheetUrl", weight: 1 },
  { key: "noteTh", weight: 1 },
];

function present(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as object).length > 0;
  return true; // numbers (price) and anything else non-null
}

export interface CompletenessResult {
  /** 0–100. */
  score: number;
  /** Field keys still missing, heaviest first — the form's improvement hints. */
  missing: (keyof CompletenessInput)[];
}

export function computeCompleteness(input: CompletenessInput): CompletenessResult {
  let score = 0;
  const missing: (keyof CompletenessInput)[] = [];
  for (const { key, weight } of WEIGHTS) {
    if (present(input[key])) score += weight;
    else missing.push(key);
  }
  return { score, missing };
}
