"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Modal } from "@/components/ui";

export interface TemplateLineDraft {
  code: string;
  zone: string;
  category: string;
  qtyUnit: string;
}

// Edit a template in place: rename + edit/add/remove/reorder its lines.
// Editing a SYSTEM template saves an org-owned copy (the shared one stays).
export function EditTemplateButton({
  templateId,
  name,
  lines,
  isSystem,
  disabled,
}: {
  templateId: string;
  name: string;
  lines: { code: string; zone: string | null; category: string | null; qtyUnit: string | null }[];
  isSystem: boolean;
  disabled: boolean;
}) {
  const t = useTranslations("library");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [rows, setRows] = useState<TemplateLineDraft[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openEditor() {
    setDraftName(isSystem ? `${name} (${t("copySuffix")})` : name);
    setRows(
      lines.map((l) => ({
        code: l.code,
        zone: l.zone ?? "",
        category: l.category ?? "",
        qtyUnit: l.qtyUnit ?? "",
      })),
    );
    setError(null);
    setOpen(true);
  }

  function setRow(i: number, patch: Partial<TemplateLineDraft>) {
    setRows((prev) => prev.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  }
  function move(i: number, dir: -1 | 1) {
    setRows((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function remove(i: number) {
    setRows((prev) => prev.filter((_, k) => k !== i));
  }
  function add() {
    setRows((prev) => [
      ...prev,
      { code: `R-${String(prev.length + 1).padStart(2, "0")}`, zone: "", category: "", qtyUnit: "" },
    ]);
  }

  async function save() {
    const clean = rows
      .map((r) => ({
        code: r.code.trim(),
        zone: r.zone.trim() || null,
        category: r.category.trim() || null,
        qtyUnit: r.qtyUnit.trim() || null,
      }))
      .filter((r) => r.code);
    if (!draftName.trim() || clean.length === 0) {
      setError(t("editEmpty"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draftName.trim(), lines: clean }),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
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

  const cell =
    "w-full rounded-sm border border-line-2 bg-surface px-2 py-1 text-sm outline-none focus:border-brand";

  return (
    <>
      <Button size="sm" variant="ghost" disabled={disabled} onClick={openEditor}>
        ✏️ {t("editTemplate")}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`✏️ ${t("editTemplate")}`}>
        <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto">
          {isSystem && <p className="text-xs text-mut">ℹ️ {t("systemCopyHint")}</p>}
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            {t("nameLabel")}
            <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} />
          </label>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-left text-sm">
              <thead>
                <tr className="text-xs text-mut">
                  <th className="px-1 py-1 font-semibold">{t("lineCode")}</th>
                  <th className="px-1 py-1 font-semibold">{t("lineZone")}</th>
                  <th className="px-1 py-1 font-semibold">{t("lineCategory")}</th>
                  <th className="px-1 py-1 font-semibold">{t("lineUnit")}</th>
                  <th className="px-1 py-1" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-1 py-1">
                      <input
                        value={r.code}
                        onChange={(e) => setRow(i, { code: e.target.value })}
                        className={cell}
                        aria-label={t("lineCode")}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        value={r.zone}
                        onChange={(e) => setRow(i, { zone: e.target.value })}
                        className={cell}
                        aria-label={t("lineZone")}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        value={r.category}
                        onChange={(e) => setRow(i, { category: e.target.value })}
                        className={cell}
                        aria-label={t("lineCategory")}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        value={r.qtyUnit}
                        onChange={(e) => setRow(i, { qtyUnit: e.target.value })}
                        className={`${cell} w-20`}
                        aria-label={t("lineUnit")}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <div className="flex items-center gap-0.5 text-mut">
                        <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={t("moveUp")} className="rounded px-1 hover:text-ink disabled:opacity-30">↑</button>
                        <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={t("moveDown")} className="rounded px-1 hover:text-ink disabled:opacity-30">↓</button>
                        <button type="button" onClick={() => remove(i)} aria-label={t("removeLine")} className="rounded px-1 hover:text-brand">✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <Button variant="ghost" size="sm" onClick={add}>
              ＋ {t("addLine")}
            </Button>
          </div>

          {error && (
            <p className="text-sm text-warn" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button disabled={pending} onClick={save}>
              {pending ? t("saving") : isSystem ? t("saveAsCopy") : t("save")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
