"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Modal } from "@/components/ui";

// Client actions on the library page: start a project from a template, delete
// own templates / sets. All Studio-gated server-side; buttons are disabled
// below Studio so the UI never promises what the API will refuse.

export function UseTemplateButton({
  templateId,
  disabled,
}: {
  templateId: string;
  disabled: boolean;
}) {
  const t = useTranslations("library");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (pending || !name.trim()) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/templates/${templateId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const data = (await res.json()) as { projectId: string };
        router.push(`/designer/projects/${data.projectId}`);
        return;
      }
      const data = (await res.json().catch(() => null)) as
        | { error?: { code?: string } }
        | null;
      setError(data?.error?.code === "studio_required" ? t("lockedShort") : t("failed"));
    } catch {
      setError(t("failed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button size="sm" disabled={disabled} onClick={() => setOpen(true)}>
        {t("useTemplate")}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("useTemplate")}>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            {t("projectNameLabel")}
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("projectNamePh")}
            />
          </label>
          {error && (
            <p className="text-sm text-warn" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button disabled={pending || !name.trim()} onClick={create}>
              {pending ? t("creating") : t("createProject")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function DeleteButton({
  url,
  disabled,
  confirmText,
}: {
  url: string;
  disabled: boolean;
  confirmText: string;
}) {
  const t = useTranslations("library");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    if (pending || !window.confirm(confirmText)) return;
    setPending(true);
    try {
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={disabled || pending}
      className="text-xs text-mut hover:text-warn disabled:opacity-50"
    >
      {t("delete")}
    </button>
  );
}
