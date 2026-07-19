import "server-only";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { buildDuplicateData } from "./duplicate";
import type { CreateProjectInput, UpdateProjectInput } from "./schemas";

// The designer org + role a user is acting as. A user may belong to several
// designer offices; for now we act as their first designer membership (a proper
// org switcher comes later). Sellers have no designer context → null.
export interface DesignerContext {
  userId: string;
  orgId: string;
  role: string;
}

export async function getDesignerContext(
  userId: string,
): Promise<DesignerContext | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId, org: { type: "designer" } },
    include: { org: { select: { id: true } } },
    orderBy: { org: { createdAt: "asc" } },
  });
  if (!membership) return null;
  return { userId, orgId: membership.orgId, role: membership.role };
}

/** Projects for an org, newest-touched first, archived sink to the bottom. */
export function listProjects(orgId: string) {
  return prisma.project.findMany({
    where: { orgId },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: { _count: { select: { specItems: true } } },
  });
}

export type ProjectListItem = Awaited<ReturnType<typeof listProjects>>[number];

/** A single project scoped to its org (returns null if it isn't in this org). */
export function getProject(orgId: string, projectId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, orgId },
    include: {
      _count: { select: { specItems: true } },
      specItems: {
        orderBy: { sortOrder: "asc" },
        include: {
          _count: { select: { options: true } },
          options: {
            orderBy: { addedAt: "asc" },
            select: { id: true, materialId: true, isConfirmed: true },
          },
        },
      },
    },
  });
}

export async function createProject(
  ctx: DesignerContext,
  input: CreateProjectInput,
) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        orgId: ctx.orgId,
        name: input.name,
        buildingType: input.buildingType ?? null,
        createdById: ctx.userId,
      },
    });
    await writeAudit(tx, {
      orgId: ctx.orgId,
      userId: ctx.userId,
      entityType: "project",
      entityId: project.id,
      action: "create",
      diff: { name: project.name },
    });
    return project;
  });
}

/** Update mutable fields; returns null if the project isn't in the org. */
export async function updateProject(
  ctx: DesignerContext,
  projectId: string,
  input: UpdateProjectInput,
) {
  const existing = await prisma.project.findFirst({
    where: { id: projectId, orgId: ctx.orgId },
  });
  if (!existing) return null;

  return prisma.$transaction(async (tx) => {
    const project = await tx.project.update({
      where: { id: projectId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.buildingType !== undefined
          ? { buildingType: input.buildingType }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });
    await writeAudit(tx, {
      orgId: ctx.orgId,
      userId: ctx.userId,
      entityType: "project",
      entityId: project.id,
      action: "update",
      diff: input,
    });
    return project;
  });
}

/** Convenience: archive is a status update, surfaced as its own action. */
export function archiveProject(ctx: DesignerContext, projectId: string) {
  return updateProject(ctx, projectId, { status: "archived" });
}

export async function deleteProject(
  ctx: DesignerContext,
  projectId: string,
): Promise<boolean> {
  const existing = await prisma.project.findFirst({
    where: { id: projectId, orgId: ctx.orgId },
    select: { id: true, name: true },
  });
  if (!existing) return false;

  await prisma.$transaction(async (tx) => {
    await tx.project.delete({ where: { id: projectId } });
    await writeAudit(tx, {
      orgId: ctx.orgId,
      userId: ctx.userId,
      entityType: "project",
      entityId: projectId,
      action: "delete",
      diff: { name: existing.name },
    });
  });
  return true;
}

/** Deep-copy a project's spec skeleton into a new project (same org). */
export async function duplicateProject(
  ctx: DesignerContext,
  projectId: string,
  name: string,
) {
  const source = await prisma.project.findFirst({
    where: { id: projectId, orgId: ctx.orgId },
    include: {
      specItems: {
        orderBy: { sortOrder: "asc" },
        include: { options: { select: { materialId: true, isConfirmed: true } } },
      },
    },
  });
  if (!source) return null;

  const data = buildDuplicateData(source, {
    orgId: ctx.orgId,
    name,
    createdById: ctx.userId,
  });

  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({ data });
    await writeAudit(tx, {
      orgId: ctx.orgId,
      userId: ctx.userId,
      entityType: "project",
      entityId: project.id,
      action: "duplicate",
      diff: { from: projectId, name },
    });
    return project;
  });
}
