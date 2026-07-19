import { z } from "zod";

// Validation for option / confirm endpoints.
export const optionSchema = z.object({
  materialId: z.string().min(1),
});
export type OptionInput = z.infer<typeof optionSchema>;

export const confirmSchema = z.object({
  materialId: z.string().min(1),
});
