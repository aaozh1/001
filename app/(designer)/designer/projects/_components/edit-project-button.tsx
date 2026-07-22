"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Modal } from "@/components/ui";
import {
  updateProjectAction,
  type UpdateProjectState,
} from "@/lib/projects/actions";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/projects/status";

const initial: UpdateProjectState = {};

export function EditProjectButton({
  project,
}: {
  project: { id: string; name: string; buildingType: string | null; status: ProjectStatus };
}) {
  const t = useTranslations("projects");
  const [open, setOpen] = useState(false);
  const action = updateProjectAction.bind(null, project.id);
  const [state, formAction, pending] = useActionState(action, initial);

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {t("edit")}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("editTitle")}
        closeLabel={t("cancel")}
      >
        <form action={formAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            {t("name")}
            <Input name="name" defaultValue={project.name} required />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            {t("buildingType")}
            <Input
              name="buildingType"
              defaultValue={project.buildingType ?? ""}
              placeholder={t("buildingTypePlaceholder")}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            {t("statusLabel")}
            <select
              name="status"
              defaultValue={project.status}
              className="w-full rounded-sm border border-line-2 bg-surface px-[14px] py-[10px] text-[16.875px] outline-none focus:border-brand"
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </select>
          </label>
          {state.error && (
            <p role="alert" className="text-sm text-brand">
              {t("invalid")}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {t("save")}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
