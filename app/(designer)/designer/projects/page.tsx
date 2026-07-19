import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { canManageProjects } from "@/lib/permissions";
import { getDesignerContext, listProjects } from "@/lib/projects/service";
import { isProjectStatus } from "@/lib/projects/status";
import { NewProjectButton } from "./_components/new-project-button";
import { ProjectCard } from "./_components/project-card";

export default async function ProjectsPage() {
  const session = await auth();
  const ctx = session?.user?.id
    ? await getDesignerContext(session.user.id)
    : null;
  if (!ctx) redirect("/designer");

  const [t, locale, projects] = await Promise.all([
    getTranslations("projects"),
    getLocale(),
    listProjects(ctx.orgId),
  ]);
  const canManage = canManageProjects(ctx.role);
  const dateFmt = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    dateStyle: "medium",
  });

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            {t("title")}
          </h1>
          <p className="mt-1 text-sub">{t("subtitle")}</p>
        </div>
        {canManage && <NewProjectButton />}
      </header>

      {projects.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-2 bg-surface p-10 text-center text-sub">
          {t("empty")}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              canManage={canManage}
              project={{
                id: p.id,
                name: p.name,
                buildingType: p.buildingType,
                status: isProjectStatus(p.status) ? p.status : "active",
                itemCount: p._count.specItems,
                updatedLabel: dateFmt.format(p.updatedAt),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
