import { z } from "zod";

// Validation for spec-item endpoints. `code` is free-form per project (never a
// hardcoded standard — ARCHITECTURE #2). qty is optional/nullable and coerced
// from the form string.

const qty = z.coerce.number().min(0).max(1_000_000_000).nullable();
const shortText = z.string().trim().max(120);

export const createSpecItemSchema = z.object({
  code: z.string().trim().min(1).max(40),
  zone: shortText.optional(),
  category: shortText.optional(),
  qty: qty.optional(),
  qtyUnit: z.string().trim().max(40).optional(),
});
export type CreateSpecItemInput = z.infer<typeof createSpecItemSchema>;

export const updateSpecItemSchema = z
  .object({
    code: z.string().trim().min(1).max(40).optional(),
    zone: shortText.nullable().optional(),
    category: shortText.nullable().optional(),
    qty: qty.optional(),
    qtyUnit: z.string().trim().max(40).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });
export type UpdateSpecItemInput = z.infer<typeof updateSpecItemSchema>;

export const reorderSpecItemsSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});
export type ReorderSpecItemsInput = z.infer<typeof reorderSpecItemsSchema>;
