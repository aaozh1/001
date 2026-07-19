import { z } from "zod";
import { PROJECT_STATUSES } from "./status";

// Validation for project endpoints (API_SPEC: validate every input with zod).

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(200),
  buildingType: z.string().trim().max(120).optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    buildingType: z.string().trim().max(120).nullable().optional(),
    status: z.enum(PROJECT_STATUSES).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const duplicateProjectSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
});
export type DuplicateProjectInput = z.infer<typeof duplicateProjectSchema>;
