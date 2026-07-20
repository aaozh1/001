"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Modal } from "@/components/ui";
import { deleteBrandAction, saveBrandAction } from "@/lib/seller/brand-actions";
import type { BrandRow } from "@/lib/seller/brand-service";

type Form = { name: string; logoUrl: string; story: string };
const EMPTY: Form = { name: "", logoUrl: "", story: "" };

export function BrandsClient({ rows, canEdit }: { rows: BrandRow[]; canEdit: boolean }) {
  const t = useTranslations("sellerBrand");
  const router = useRouter();
  const [editing, setEditing] = useState<{ id: string | null; form: Form } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!editing || pending) return;
    setPending(true);
    setError(null);
    try {
      const r = await saveBrandAction(editing.id, editing.form);
      if (r.ok) {
        setEditing(null);
        router.refresh();
      } else {
        setError(t("errFailed"));
      }
    } catch {
      setError(t("errFailed"));
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm(t("deleteConfirm"))) return;
    await deleteBrandAction(id);
    router.refresh();
  }

  const set = (key: keyof Form, value: string) =>
    setEditing((prev) => (prev ? { ...prev, form: { ...prev.form, [key]: value } } : prev));

  return (
    <>
      {canEdit && (
        <div className="mb-4">
          <Button size="sm" onClick={() => setEditing({ id: null, form: EMPTY })}>
            {t("new")}
          </Button>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-2 bg-surface p-10 text-center text-sub">
          {t("empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface p-4 shadow-soft"
            >
              <div className="min-w-0">
                <div className="font-semibold text-ink">{b.name}</div>
                <div className="mt-0.5 text-xs text-mut">
                  {t("materialCount", { n: b.materialCount })}
                </div>
                {b.story && <p className="mt-1 line-clamp-2 text-sm text-sub">{b.story}</p>}
              </div>
              {canEdit && (
                <div className="flex shrink-0 items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setEditing({
                        id: b.id,
                        form: { name: b.name, logoUrl: b.logoUrl ?? "", story: b.story ?? "" },
                      })
                    }
                  >
                    {t("edit")}
                  </Button>
                  <button
                    type="button"
                    onClick={() => remove(b.id)}
                    className="text-xs text-mut hover:text-warn"
                  >
                    {t("delete")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? t("editTitle") : t("newTitle")}
      >
        {editing && (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-ink">
              {t("fName")} *
              <Input value={editing.form.name} onChange={(e) => set("name", e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink">
              {t("fLogo")}
              <Input
                value={editing.form.logoUrl}
                onChange={(e) => set("logoUrl", e.target.value)}
                placeholder="https://…"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink">
              {t("fStory")}
              <textarea
                value={editing.form.story}
                onChange={(e) => set("story", e.target.value)}
                rows={3}
                className="rounded-sm border border-line-2 bg-surface px-3 py-2 text-sm font-normal outline-none focus:border-brand"
              />
            </label>
            {error && (
              <p className="text-sm text-warn" role="alert">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                {t("cancel")}
              </Button>
              <Button onClick={save} disabled={pending || !editing.form.name.trim()}>
                {pending ? t("saving") : t("save")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
