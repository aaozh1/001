import { z } from "zod";
import { WORKSPACES } from "@/lib/permissions";

// Input validation for auth endpoints (API_SPEC: "validate input (zod) ทุกตัว").
// Kept free of Node/Prisma imports so it is safe to reuse anywhere.

export const PASSWORD_MIN = 8;
// bcrypt silently truncates input beyond 72 bytes — passwords longer than
// that would compare equal on their first 72 bytes, so cap at the boundary.
export const PASSWORD_MAX = 72;

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(PASSWORD_MIN).max(PASSWORD_MAX),
  name: z.string().trim().min(1).max(120),
  role: z.enum(WORKSPACES),
  orgName: z.string().trim().min(1).max(200),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(PASSWORD_MAX),
});

export type LoginInput = z.infer<typeof loginSchema>;
