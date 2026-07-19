import type { SpecStatus } from "@/lib/spec/status";

export interface OptionView {
  materialId: string;
  name: string;
  brand: string | null;
  model: string | null;
  swatchHex: string | null;
  isConfirmed: boolean;
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
}
