import { z } from "zod";

// POST /api/rfq input (API_SPEC: { item_ids[], deadline, note, want_sample }).
export const sendRfqSchema = z.object({
  itemIds: z.array(z.string().min(1)).min(1).max(200),
  deadline: z.string().datetime().nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
  wantSample: z.boolean().optional(),
});
export type SendRfqBody = z.infer<typeof sendRfqSchema>;
