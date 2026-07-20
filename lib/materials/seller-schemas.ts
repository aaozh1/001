import { z } from "zod";

// Product form (ฟอร์มสินค้า, ROADMAP 3.3). Everything beyond nameTh + category
// is optional — completeness scoring nudges sellers to fill the rest.
export const materialFormSchema = z.object({
  nameTh: z.string().trim().min(1).max(160),
  nameEn: z.string().trim().max(160).optional(),
  model: z.string().trim().max(120).optional(),
  sku: z.string().trim().max(80).optional(),
  category: z.string().trim().min(1).max(80),
  color: z.string().trim().max(120).optional(),
  size: z.string().trim().max(120).optional(),
  price: z.coerce.number().min(0).max(1_000_000_000).nullable().optional(),
  unit: z.string().trim().max(40).optional(),
  cert: z.string().trim().max(160).optional(),
  leadTime: z.string().trim().max(120).optional(),
  moq: z.string().trim().max(120).optional(),
  warranty: z.string().trim().max(120).optional(),
  noteTh: z.string().trim().max(500).optional(),
  swatchHex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .or(z.literal("")),
  specsheetUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
});

export type MaterialFormInput = z.infer<typeof materialFormSchema>;

export const materialStatusSchema = z.enum(["draft", "published", "hidden"]);
export type EditableMaterialStatus = z.infer<typeof materialStatusSchema>;
