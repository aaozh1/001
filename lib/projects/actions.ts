"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { canManageProjects } from "@/lib/permissions";
import { createProjectSchema, updateProjectSchema } from "./schemas";
import { duplicateName } from "./duplicate";
import {
  archiveProject,
  createProject,
  deleteProject,
  duplicateProject,
  getDesignerContext,
  getProject,
  updateProject,
  type DesignerContext,
} from "./service";

const LIST_PATH = "/designer/projects";

// Server actions powering the projects UI. Each re-checks auth + manage role;
// the UI also hides mutating controls from viewers, this is the backstop.
async function managerCtx(): Promise<DesignerContext> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("unauthorized");
  const ctx = await getDesignerContext(session.user.id);
  if (!ctx || !canManageProjects(ctx.role)) throw new Error("forbidden");
  return ctx;
}

export type CreateProjectState = { error?: string };

export async function createProjectAction(
  _prev: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const ctx = await managerCtx();
  const parsed = createProjectSchema.safeParse({
    name: formData.get("name"),
    buildingType: (formData.get("buildingType") as string) || undefined,
  });
  if (!parsed.success) return { error: "invalid" };

  const project = await createProject(ctx, parsed.data);
  revalidatePath(LIST_PATH);
  redirect(`${LIST_PATH}/${project.id}`);
}

export type UpdateProjectState = { error?: string; ok?: boolean };

export async function updateProjectAction(
  id: string,
  _prev: UpdateProjectState,
  formData: FormData,
): Promise<UpdateProjectState> {
  const ctx = await managerCtx();
  const buildingType = ((formData.get("buildingType") as string) ?? "").trim();
  const parsed = updateProjectSchema.safeParse({
    name: formData.get("name"),
    buildingType: buildingType || null,
    status: formData.get("status") ?? undefined,
  });
  if (!parsed.success) return { error: "invalid" };

  const updated = await updateProject(ctx, id, parsed.data);
  if (!updated) return { error: "not_found" };

  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${id}`);
  return { ok: true };
}

export async function duplicateProjectAction(id: string) {
  const ctx = await managerCtx();
  const source = await getProject(ctx.orgId, id);
  if (!source) return;
  const t = await getTranslations("projects");
  await duplicateProject(ctx, id, duplicateName(source.name, t("copySuffix")));
  revalidatePath(LIST_PATH);
}

export async function archiveProjectAction(id: string) {
  const ctx = await managerCtx();
  await archiveProject(ctx, id);
  revalidatePath(LIST_PATH);
}

export async function unarchiveProjectAction(id: string) {
  const ctx = await managerCtx();
  await updateProject(ctx, id, { status: "active" });
  revalidatePath(LIST_PATH);
}

export async function deleteProjectAction(id: string) {
  const ctx = await managerCtx();
  await deleteProject(ctx, id);
  revalidatePath(LIST_PATH);
  redirect(LIST_PATH);
}
