import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Card } from "@/components/ui";
import { canManageProjects } from "@/lib/permissions";
import { getDesignerContext, getProject } from "@/lib/projects/service";
import { isProjectStatus } from "@/lib/projects/status";
import { deriveSpecStatus } from "@/lib/spec/status";
import { getMaterialsByIds } from "@/lib/materials/service";
import { ProjectStatusBadge } from "../_components/project-status-badge";
import { EditProjectButton } from "../_components/edit-project-button";
import { SpecViews } from "./_components/spec-views";
import type { SpecRow } from "./_components/types";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectDetailPage({ params }: Props) {
  const session = await auth();
  const ctx = session?.user?.id
    ? await getDesignerContext(session.user.id)
    : null;
  if (!ctx) redirect("/designer");

  const { id } = await params;
  const project = await getProject(ctx.orgId, id);
  if (!project) notFound();

  const t = await getTranslations("projects");
  const canManage = canManageProjects(ctx.role);
  const status = isProjectStatus(project.status) ? project.status : "active";

  // Resolve material summaries for every option across the schedule.
  const optionMaterialIds = project.specItems.flatMap((i) =>
    i.options.map((o) => o.materialId),
  );
  const materials = await getMaterialsByIds(optionMaterialIds);

  const rows: SpecRow[] = project.specItems.map((item) => ({
    id: item.id,
    code: item.code,
    zone: item.zone ?? "",
    category: item.category ?? "",
    qty: item.qty ? item.qty.toString() : "",
    qtyUnit: item.qtyUnit ?? "",
    confirmedMaterialId: item.confirmedMaterialId,
    status: deriveSpecStatus({
      confirmedMaterialId: item.confirmedMaterialId,
      optionCount: item._count.options,
    }),
    options: item.options.map((o) => {
      const m = materials.get(o.materialId);
      return {
        materialId: o.materialId,
        name: m?.nameTh ?? "—",
        brand: m?.brand ?? null,
        model: m?.model ?? null,
        category: m?.category ?? item.category ?? "",
        swatchHex: m?.swatchHex ?? null,
        isConfirmed: o.isConfirmed,
      };
    }),
  }));

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/designer/projects" className="text-sm text-sub hover:text-ink">
        {t("back")}
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              {project.name}
            </h1>
            <ProjectStatusBadge status={status} />
          </div>
          <p className="mt-1 text-sub">
            {project.buildingType ?? "—"} · {project._count.specItems}{" "}
            {t("items")}
          </p>
        </div>
        {canManage && (
          <EditProjectButton
            project={{
              id: project.id,
              name: project.name,
              buildingType: project.buildingType,
              status,
            }}
          />
        )}
      </header>

      <Card className="mt-4" padded={false}>
        <SpecViews projectId={project.id} canManage={canManage} items={rows} />
      </Card>
    </div>
  );
}
