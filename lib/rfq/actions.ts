"use server";

import { revalidatePath } from "next/cache";
import { managerContextOrThrow } from "@/lib/projects/manager-context";
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

export async function sendRfqsAction(
  input: SendRfqActionInput,
): Promise<SendRfqActionResult> {
  const ctx = await managerContextOrThrow();
  if (input.itemIds.length === 0) return { ok: false, error: "empty" };

  const result = await sendRfqs(
    ctx,
    {
      specItemIds: input.itemIds,
      deadline: input.deadline ? new Date(input.deadline) : null,
      note: input.note?.trim() || null,
      wantSample: input.wantSample,
    },
    new Date(),
  );
  revalidatePath(`/designer/projects/${input.projectId}`);
  return { ok: true, ...result };
}
