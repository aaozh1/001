import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { EVENTS } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { writeAudit } from "@/lib/audit";
import type { DesignerContext } from "@/lib/projects/service";
import {
  buildSpecBookSnapshot,
  nextVersion,
  type MaterialFull,
  type SpecBookSnapshot,
} from "./snapshot";

function specText(spec: Prisma.JsonValue | null, key: "summary_th" | "summary_en") {
  if (spec && typeof spec === "object" && !Array.isArray(spec)) {
    const v = (spec as Record<string, unknown>)[key];
    return typeof v === "string" ? v : null;
  }
  return null;
}

/** Create a new Spec Book version: freeze the schedule + store the snapshot. */
export async function createSpecBook(
  ctx: DesignerContext,
  projectId: string,
  generatedAtDisplay: string,
): Promise<{ version: number } | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, orgId: ctx.orgId },
    select: {
      name: true,
      buildingType: true,
      specItems: {
        orderBy: { sortOrder: "asc" },
        select: {
          code: true,
          zone: true,
          category: true,
          qty: true,
          qtyUnit: true,
          options: {
            orderBy: { addedAt: "asc" },
            select: { materialId: true, isConfirmed: true },
          },
        },
      },
    },
  });
  if (!project) return null;

  const materialIds = [
    ...new Set(project.specItems.flatMap((i) => i.options.map((o) => o.materialId))),
  ];
  const materialRows = await prisma.material.findMany({
    where: { id: { in: materialIds } },
    include: { brand: { select: { name: true } }, seller: { select: { name: true } } },
  });
  const materials = new Map<string, MaterialFull>(
    materialRows.map((m) => [
      m.id,
      {
        nameTh: m.nameTh,
        nameEn: m.nameEn,
        brand: m.brand?.name ?? null,
        model: m.model,
        sku: m.sku,
        sellerName: m.seller?.name ?? null,
        price: m.price ? m.price.toString() : null,
        unit: m.unit,
        specTh: specText(m.spec, "summary_th"),
        specEn: specText(m.spec, "summary_en"),
        cert: m.cert,
        leadTime: m.leadTime,
        moq: m.moq,
        warranty: m.warranty,
        noteTh: m.noteTh,
        noteEn: m.noteEn,
        swatchHex: m.swatchHex,
        image: m.images[0] ?? null,
      },
    ]),
  );

  const snapshot = buildSpecBookSnapshot(
    { name: project.name, buildingType: project.buildingType },
    project.specItems.map((i) => ({
      code: i.code,
      zone: i.zone,
      category: i.category,
      qty: i.qty ? i.qty.toString() : null,
      qtyUnit: i.qtyUnit,
      options: i.options,
    })),
    materials,
    generatedAtDisplay,
  );

  const existing = await prisma.specBook.findMany({
    where: { projectId },
    select: { version: true },
  });
  const version = nextVersion(existing.map((e) => e.version));

  const result = await prisma.$transaction(async (tx) => {
    await tx.specBook.create({
      data: {
        projectId,
        version,
        createdBy: ctx.userId,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
      },
    });
    await writeAudit(tx, {
      orgId: ctx.orgId,
      userId: ctx.userId,
      entityType: "spec_book",
      entityId: projectId,
      action: "create",
      diff: { version },
    });
    return { version };
  });
  await track(EVENTS.specbookCreated, { orgId: ctx.orgId, userId: ctx.userId });
  return result;
}

export async function listSpecBooks(orgId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, orgId },
    select: { id: true },
  });
  if (!project) return null;
  return prisma.specBook.findMany({
    where: { projectId },
    orderBy: { version: "desc" },
    select: { version: true, createdAt: true, shareToken: true },
  });
}

/** Enable/disable the public share link for a version (เพิกถอนได้ตลอด). */
export async function setSpecBookShare(
  orgId: string,
  projectId: string,
  version: number,
  enable: boolean,
): Promise<{ ok: true; token: string | null } | { ok: false }> {
  const book = await prisma.specBook.findFirst({
    where: { projectId, version, project: { orgId } },
    select: { id: true, shareToken: true },
  });
  if (!book) return { ok: false };
  if (!enable) {
    await prisma.specBook.update({ where: { id: book.id }, data: { shareToken: null } });
    return { ok: true, token: null };
  }
  if (book.shareToken) return { ok: true, token: book.shareToken };
  const { randomBytes } = await import("crypto");
  const token = randomBytes(9).toString("base64url");
  await prisma.specBook.update({ where: { id: book.id }, data: { shareToken: token } });
  return { ok: true, token };
}

/** Public read for /s/[token] — the frozen snapshot only, no org internals. */
export async function getSharedSpecBook(token: string) {
  if (!/^[A-Za-z0-9_-]{8,24}$/.test(token)) return null;
  const book = await prisma.specBook.findUnique({
    where: { shareToken: token },
    select: { version: true, snapshot: true, createdAt: true },
  });
  return book;
}

/** The frozen snapshot for one version (org-scoped). */
export async function getSpecBookSnapshot(
  orgId: string,
  projectId: string,
  version: number,
): Promise<SpecBookSnapshot | null> {
  const book = await prisma.specBook.findFirst({
    where: { projectId, version, project: { orgId } },
    select: { snapshot: true },
  });
  if (!book?.snapshot) return null;
  return book.snapshot as unknown as SpecBookSnapshot;
}
