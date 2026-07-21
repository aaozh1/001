"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { canManageProjects } from "@/lib/permissions";
import { getDesignerContext } from "@/lib/projects/service";
import { IMAGE_MAX_BYTES } from "@/lib/files/storage";
import { addIssue, addSitePhoto, setInstalled } from "./service";

// 5J site-visit actions. Mutations need a managing designer role (viewers get
// the read-only checklist); every write re-checks project ownership in the
// service layer.

type ActionResult = { ok: true } | { ok: false; error: string };

async function managerCtx() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const ctx = await getDesignerContext(session.user.id);
  if (!ctx || !canManageProjects(ctx.role)) return null;
  return ctx;
}

export async function setInstalledAction(
  projectId: string,
  specItemId: string,
  installed: boolean,
): Promise<ActionResult> {
  const ctx = await managerCtx();
  if (!ctx) return { ok: false, error: "forbidden" };
  const ok = await setInstalled(ctx.orgId, projectId, specItemId, Boolean(installed));
  if (!ok) return { ok: false, error: "not_found" };
  revalidatePath(`/designer/projects/${projectId}/site-visit`);
  return { ok: true };
}

export async function addSitePhotoAction(
  projectId: string,
  specItemId: string,
  form: FormData,
): Promise<ActionResult> {
  const ctx = await managerCtx();
  if (!ctx) return { ok: false, error: "forbidden" };

  const file = form.get("file");
  if (!(file instanceof File)) return { ok: false, error: "invalid" };
  if (file.size > IMAGE_MAX_BYTES) return { ok: false, error: "too_large" };

  try {
    const r = await addSitePhoto(
      ctx.orgId,
      ctx.userId,
      projectId,
      specItemId,
      Buffer.from(await file.arrayBuffer()),
    );
    if (!r.ok) return { ok: false, error: "not_found" };
  } catch {
    return { ok: false, error: "invalid" };
  }
  revalidatePath(`/designer/projects/${projectId}/site-visit`);
  return { ok: true };
}

const issueSchema = z.object({
  specItemId: z.string().nullable(),
  note: z.string().trim().min(1).max(500),
});

export async function addIssueAction(
  projectId: string,
  raw: unknown,
): Promise<ActionResult> {
  const ctx = await managerCtx();
  if (!ctx) return { ok: false, error: "forbidden" };

  const parsed = issueSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const ok = await addIssue(
    ctx.orgId,
    ctx.userId,
    projectId,
    parsed.data.specItemId,
    parsed.data.note,
  );
  if (!ok) return { ok: false, error: "not_found" };
  revalidatePath(`/designer/projects/${projectId}/site-visit`);
  return { ok: true };
}
