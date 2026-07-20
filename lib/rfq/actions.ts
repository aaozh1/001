"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { managerContextOrThrow } from "@/lib/projects/manager-context";
import { sendRfqSchema } from "./schemas";
import { sendRfqs } from "./service";

export interface SendRfqActionInput {
  projectId: string;
  itemIds: string[];
  deadline: string | null;
  note: string | null;
  wantSample: boolean;
}

export type SendRfqActionResult =
  | { ok: true; created: number; skipped: number; recipients: number }
  | { ok: false; error: string };

// Server actions are public POST endpoints too — validate exactly like the
// API route (item cap, note length, real ISO deadline); otherwise a garbage
// deadline becomes `Invalid Date` and a 500 inside the transaction.
const actionSchema = sendRfqSchema.extend({ projectId: z.string().min(1) });

export async function sendRfqsAction(
  input: SendRfqActionInput,
): Promise<SendRfqActionResult> {
  const ctx = await managerContextOrThrow();

  const parsed = actionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const result = await sendRfqs(
    ctx,
    {
      specItemIds: parsed.data.itemIds,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
      note: parsed.data.note?.trim() || null,
      wantSample: parsed.data.wantSample ?? false,
    },
    new Date(),
  );
  revalidatePath(`/designer/projects/${parsed.data.projectId}`);
  return { ok: true, ...result };
}
