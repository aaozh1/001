import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { canManageProjects, PROJECT_MANAGER_ROLES } from "@/lib/permissions";
import {
  buildDuplicateData,
  duplicateName,
  type DuplicableProject,
} from "@/lib/projects/duplicate";
import {
  PROJECT_STATUSES,
  isProjectStatus,
  projectStatusVariant,
} from "@/lib/projects/status";

describe("canManageProjects", () => {
  it("owner and editor can manage, viewer cannot", () => {
    expect(canManageProjects("owner")).toBe(true);
    expect(canManageProjects("editor")).toBe(true);
    expect(canManageProjects("viewer")).toBe(false);
    // a seller-side role is never a project manager here
    expect(canManageProjects("sales")).toBe(false);
  });

  it("PROJECT_MANAGER_ROLES is exactly owner + editor", () => {
    expect([...PROJECT_MANAGER_ROLES]).toEqual(["owner", "editor"]);
  });
});

describe("project status", () => {
  it("maps every status to a variant", () => {
    expect(PROJECT_STATUSES.map(projectStatusVariant)).toEqual([
      "info",
      "warn",
      "ok",
      "neutral",
    ]);
  });

  it("guards status values", () => {
    expect(isProjectStatus("active")).toBe(true);
    expect(isProjectStatus("archived")).toBe(true);
    expect(isProjectStatus("nonsense")).toBe(false);
    expect(isProjectStatus(undefined)).toBe(false);
  });
});

describe("buildDuplicateData", () => {
  const source: DuplicableProject = {
    name: "Hua Hin house",
    buildingType: "detached",
    specItems: [
      {
        code: "FL-01",
        zone: "living",
        category: "tiles",
        qty: new Prisma.Decimal(48),
        qtyUnit: "sqm",
        confirmedMaterialId: "mat-1",
        sortOrder: 0,
        options: [
          { materialId: "mat-1", isConfirmed: true },
          { materialId: "mat-2", isConfirmed: false },
        ],
      },
      {
        code: "WL-01",
        zone: "bath",
        category: "tiles",
        qty: null,
        qtyUnit: null,
        confirmedMaterialId: null,
        sortOrder: 1,
        options: [],
      },
    ],
  };

  it("uses the target name/org and resets status to active", () => {
    const data = buildDuplicateData(source, {
      orgId: "org-9",
      name: "Hua Hin house (copy)",
      createdById: "user-1",
    });
    expect(data.name).toBe("Hua Hin house (copy)");
    expect(data.status).toBe("active");
    expect(data.org).toEqual({ connect: { id: "org-9" } });
    expect(data.createdBy).toEqual({ connect: { id: "user-1" } });
  });

  it("deep-copies every spec item and its options", () => {
    const data = buildDuplicateData(source, { orgId: "org-9", name: "copy" });
    const items = (data.specItems as { create: unknown[] }).create;
    expect(items).toHaveLength(2);

    const first = items[0] as {
      code: string;
      confirmedMaterialId: string | null;
      options: { create: unknown[] };
    };
    expect(first.code).toBe("FL-01");
    expect(first.confirmedMaterialId).toBe("mat-1");
    expect(first.options.create).toHaveLength(2);
  });

  it("omits transactional relations (no rfqs / veHistory)", () => {
    const data = buildDuplicateData(source, { orgId: "org-9", name: "copy" });
    expect("rfqs" in data).toBe(false);
    expect("specBooks" in data).toBe(false);
  });

  it("skips createdBy when none is provided", () => {
    const data = buildDuplicateData(source, { orgId: "org-9", name: "copy" });
    expect("createdBy" in data).toBe(false);
  });

  it("duplicateName appends the copy suffix", () => {
    expect(duplicateName("Villa", "copy")).toBe("Villa (copy)");
    expect(duplicateName("Villa", "สำเนา")).toBe("Villa (สำเนา)");
  });
});
