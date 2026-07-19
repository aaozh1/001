import { z } from "zod";

// POST /api/rfq/:id/quote (seller answers). price_per_unit is required; the rest
// are optional terms.
export const quoteSchema = z.object({
  pricePerUnit: z.coerce.number().positive().max(1_000_000_000),
  projectDiscount: z.coerce.number().min(0).max(1_000_000_000).nullable().optional(),
  leadTime: z.string().trim().max(120).nullable().optional(),
  paymentTerms: z.string().trim().max(200).nullable().optional(),
  validUntil: z.string().datetime().nullable().optional(),
  includeSample: z.boolean().optional(),
});
export type QuoteInput = z.infer<typeof quoteSchema>;
