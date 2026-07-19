import { z } from "zod";

// Registration input: {email, password, role} + optional name. `role` is the
// workspace SIDE the account starts on (designer|seller) — it becomes an
// Organization of that type with the user as owner. (API_SPEC /api/auth/register)
export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
  name: z.string().trim().min(1).max(120).optional(),
  role: z.enum(["designer", "seller"]),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
