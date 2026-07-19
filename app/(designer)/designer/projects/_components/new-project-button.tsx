"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Modal } from "@/components/ui";
import {
  createProjectAction,
  type CreateProjectState,
} from "@/lib/projects/actions";
import { useState } from "react";

const initial: CreateProjectState = {};

export function NewProjectButton() {
  const t = useTranslations("projects");
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    createProjectAction,
    initial,
  );

  return (
    <>
      <Button onClick={() => setOpen(true)}>{t("new")}</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("createTitle")}
        closeLabel={t("cancel")}
      >
        <form action={formAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            {t("name")}
            <Input
              name="name"
              required
              autoFocus
              placeholder={t("namePlaceholder")}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            {t("buildingType")}
            <Input name="buildingType" placeholder={t("buildingTypePlaceholder")} />
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
              {t("create")}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
