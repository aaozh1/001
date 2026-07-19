"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui";
import { cn } from "@/lib/ui/cn";
import type { ProjectStatus } from "@/lib/projects/status";
import { ProjectStatusBadge } from "./project-status-badge";
import {
  archiveProjectAction,
  deleteProjectAction,
  duplicateProjectAction,
  unarchiveProjectAction,
} from "@/lib/projects/actions";

export interface ProjectCardData {
  id: string;
  name: string;
  buildingType: string | null;
  status: ProjectStatus;
  itemCount: number;
  updatedLabel: string;
}

export function ProjectCard({
  project,
  canManage,
}: {
  project: ProjectCardData;
  canManage: boolean;
}) {
  const t = useTranslations("projects");
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<unknown>) => () => startTransition(() => void fn());

  const confirmDelete = () => {
    if (window.confirm(t("deleteConfirm"))) {
      startTransition(() => void deleteProjectAction(project.id));
    }
  };

  const href = `/designer/projects/${project.id}`;

  return (
    <Card
      interactive
      className={cn("gap-3", project.status === "archived" && "opacity-60")}
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={href} className="font-semibold text-ink hover:text-brand">
          {project.name}
        </Link>
        <ProjectStatusBadge status={project.status} />
      </div>

      <div className="text-sm text-sub">
        {project.buildingType && <span>{project.buildingType} · </span>}
        <span>
          {project.itemCount} {t("items")}
        </span>
      </div>
      <div className="text-xs text-mut">
        {t("updated")} {project.updatedLabel}
      </div>

      <div className="mt-auto flex flex-wrap gap-3 pt-2 text-sm">
        <Link href={href} className="font-medium text-brand hover:underline">
          {t("open")}
        </Link>
        {canManage && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={run(() => duplicateProjectAction(project.id))}
              className="text-sub hover:text-ink disabled:opacity-50"
            >
              {t("duplicate")}
            </button>
            {project.status === "archived" ? (
              <button
                type="button"
                disabled={pending}
                onClick={run(() => unarchiveProjectAction(project.id))}
                className="text-sub hover:text-ink disabled:opacity-50"
              >
                {t("unarchive")}
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={run(() => archiveProjectAction(project.id))}
                className="text-sub hover:text-ink disabled:opacity-50"
              >
                {t("archive")}
              </button>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={confirmDelete}
              className="text-sub hover:text-brand disabled:opacity-50"
            >
              {t("delete")}
            </button>
          </>
        )}
      </div>
    </Card>
  );
}
