import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Card } from "@/components/ui";
import { canManageProjects } from "@/lib/permissions";
import { getDesignerContext, getProject } from "@/lib/projects/service";
import { isProjectStatus } from "@/lib/projects/status";
import { ProjectStatusBadge } from "../_components/project-status-badge";
import { EditProjectButton } from "../_components/edit-project-button";

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

      <p className="mt-4 text-sm text-mut">{t("detailIntro")}</p>

      <Card className="mt-4" padded={false}>
        <div className="border-b border-line px-5 py-3 font-semibold text-ink">
          {t("specItems")}
        </div>
        {project.specItems.length === 0 ? (
          <p className="px-5 py-8 text-center text-sub">{t("noItems")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-mut">
                  <th className="px-5 py-2 font-semibold">{t("colCode")}</th>
                  <th className="px-5 py-2 font-semibold">{t("colZone")}</th>
                  <th className="px-5 py-2 font-semibold">{t("colCategory")}</th>
                  <th className="px-5 py-2 font-semibold">{t("colQty")}</th>
                  <th className="px-5 py-2 font-semibold">{t("colOptions")}</th>
                </tr>
              </thead>
              <tbody>
                {project.specItems.map((item) => (
                  <tr key={item.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-2.5 font-medium text-ink">
                      {item.code}
                    </td>
                    <td className="px-5 py-2.5 text-sub">{item.zone ?? "—"}</td>
                    <td className="px-5 py-2.5 text-sub">
                      {item.category ?? "—"}
                    </td>
                    <td className="px-5 py-2.5 text-sub">
                      {item.qty ? `${item.qty.toString()} ${item.qtyUnit ?? ""}` : "—"}
                    </td>
                    <td className="px-5 py-2.5 text-sub">{item._count.options}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
