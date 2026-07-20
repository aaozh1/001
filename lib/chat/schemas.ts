import { z } from "zod";
import { MAX_MESSAGE_LEN } from "./logic";

// POST /api/chat/:threadId/messages — send one message.
export const postMessageSchema = z.object({
  body: z.string().trim().min(1).max(MAX_MESSAGE_LEN),
});
export type PostMessageBody = z.infer<typeof postMessageSchema>;

// POST /api/chat — designer opens (or reuses) a thread with a seller for a project.
export const openThreadSchema = z.object({
  sellerOrgId: z.string().min(1),
  projectId: z.string().min(1),
});
export type OpenThreadBody = z.infer<typeof openThreadSchema>;
