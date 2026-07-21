import "server-only";
import { prisma } from "@/lib/db";
import { saveImage } from "@/lib/files/storage";
import { getRfqStatusMap } from "@/lib/rfq/service";
import { deriveSpecStatus, rfqFlags, type SpecStatus } from "@/lib/spec/status";

// 5J site-visit companion — the schedule, checkable at the job site.
// Reads/writes stay inside the designer org's own project (same ownership
// check every project service uses); photos ride the existing upload pipe.

export interface SiteVisitLog {
  id: string;
  kind: string; // "photo" | "issue"
  note: string | null;
  photo: string | null;
  createdAt: string;
}

export interface SiteVisitItem {
  id: string;
  code: string;
  zone: string | null;
  qty: string | null;
  qtyUnit: string | null;
  materialName: string | null;
  swatchHex: string | null;
  image: string | null;
  status: SpecStatus;
  installedAt: string | null;
  logs: SiteVisitLog[];
}

export interface SiteVisitView {
  projectId: string;
  projectName: string;
  items: SiteVisitItem[];
}

export async function getSiteVisit(
  orgId: string,
  projectId: string,
): Promise<SiteVisitView | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, orgId },
    select: {
      id: true,
      name: true,
      specItems: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          code: true,
          zone: true,
          qty: true,
          qtyUnit: true,
          confirmedMaterialId: true,
          installedAt: true,
          confirmedMaterial: {
            select: { nameTh: true, swatchHex: true, images: true },
          },
          _count: { select: { options: true } },
        },
      },
      siteLogs: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          specItemId: true,
          kind: true,
          note: true,
          photo: true,
          createdAt: true,
        },
      },
    },
  });
  if (!project) return null;

  const rfqMap = await getRfqStatusMap(project.id);
  const logsByItem = new Map<string | null, SiteVisitLog[]>();
  for (const log of project.siteLogs) {
    const key = log.specItemId ?? null;
    const list = logsByItem.get(key) ?? [];
    list.push({
      id: log.id,
      kind: log.kind,
      note: log.note,
      photo: log.photo,
      createdAt: log.createdAt.toISOString(),
    });
    logsByItem.set(key, list);
  }

  return {
    projectId: project.id,
    projectName: project.name,
    items: project.specItems.map((item) => ({
      id: item.id,
      code: item.code,
      zone: item.zone,
      qty: item.qty ? item.qty.toString() : null,
      qtyUnit: item.qtyUnit,
      materialName: item.confirmedMaterial?.nameTh ?? null,
      swatchHex: item.confirmedMaterial?.swatchHex ?? null,
      image: item.confirmedMaterial?.images[0] ?? null,
      status: deriveSpecStatus({
        confirmedMaterialId: item.confirmedMaterialId,
        optionCount: item._count.options,
        ...rfqFlags(rfqMap.get(item.id)),
      }),
      installedAt: item.installedAt ? item.installedAt.toISOString() : null,
      logs: logsByItem.get(item.id) ?? [],
    })),
  };
}

/** Toggle the "ติดตั้งแล้ว" checkmark on one line. */
export async function setInstalled(
  orgId: string,
  projectId: string,
  specItemId: string,
  installed: boolean,
): Promise<boolean> {
  const r = await prisma.specItem.updateMany({
    where: { id: specItemId, projectId, project: { id: projectId, orgId } },
    data: { installedAt: installed ? new Date() : null },
  });
  return r.count > 0;
}

/** Pin a site photo to a line item. */
export async function addSitePhoto(
  orgId: string,
  userId: string,
  projectId: string,
  specItemId: string,
  buf: Buffer,
): Promise<{ ok: true; photo: string } | { ok: false }> {
  const item = await prisma.specItem.findFirst({
    where: { id: specItemId, projectId, project: { id: projectId, orgId } },
    select: { id: true },
  });
  if (!item) return { ok: false };
  const photo = await saveImage(buf);
  await prisma.siteLog.create({
    data: { projectId, specItemId, kind: "photo", photo, createdById: userId },
  });
  return { ok: true, photo };
}

/** Log an issue (wrong color, damage, shortfall) — optionally on a line item. */
export async function addIssue(
  orgId: string,
  userId: string,
  projectId: string,
  specItemId: string | null,
  note: string,
): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, orgId },
    select: { id: true },
  });
  if (!project) return false;
  if (specItemId) {
    const item = await prisma.specItem.findFirst({
      where: { id: specItemId, projectId },
      select: { id: true },
    });
    if (!item) return false;
  }
  await prisma.siteLog.create({
    data: { projectId, specItemId, kind: "issue", note, createdById: userId },
  });
  return true;
}

/** Project-level issue log (line-item issues render on their cards). */
export async function listProjectIssues(
  orgId: string,
  projectId: string,
): Promise<SiteVisitLog[]> {
  const rows = await prisma.siteLog.findMany({
    where: { projectId, specItemId: null, kind: "issue", project: { orgId } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, kind: true, note: true, photo: true, createdAt: true },
  });
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    note: r.note,
    photo: r.photo,
    createdAt: r.createdAt.toISOString(),
  }));
}
