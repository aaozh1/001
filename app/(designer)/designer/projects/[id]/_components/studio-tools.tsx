"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Modal } from "@/components/ui";

interface SetOption {
  id: string;
  name: string;
}

// Studio tools on a project: save the structure as a template, save/apply a
// material set. Locked (with an upgrade pointer) below the Studio plan — the
// server enforces the same gate, this is just the honest UI for it.
export function StudioTools({
  projectId,
  canStudio,
  canManage,
  sets,
}: {
  projectId: string;
  canStudio: boolean;
  canManage: boolean;
  sets: SetOption[];
}) {
  const t = useTranslations("library");
  const router = useRouter();
  const [modal, setModal] = useState<"template" | "set" | "apply" | null>(null);
  const [name, setName] = useState("");
  const [setId, setSetId] = useState(sets[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (!canManage) return null;

  async function post(url: string, body: unknown): Promise<Response> {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function run(kind: "template" | "set" | "apply") {
    if (pending) return;
    setPending(true);
    setToast(null);
    try {
      let res: Response;
      if (kind === "template") res = await post("/api/templates", { projectId, name });
      else if (kind === "set") res = await post("/api/material-sets", { projectId, name });
      else res = await post(`/api/material-sets/${setId}`, { projectId });

      if (res.ok) {
        if (kind === "apply") {
          const data = (await res.json()) as { added: number };
          setToast(t("appliedToast", { added: data.added }));
          router.refresh();
        } else {
          setToast(t(kind === "template" ? "templateSaved" : "setSaved"));
        }
        setModal(null);
        setName("");
      } else {
        const data = (await res.json().catch(() => null)) as
          | { error?: { code?: string } }
          | null;
        setToast(
          data?.error?.code === "studio_required" ? t("lockedShort") : t("failed"),
        );
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4 rounded-card border border-line bg-surface p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">{t("studioTools")}</h2>
          <p className="text-xs text-mut">{t("studioToolsHint")}</p>
        </div>
        {!canStudio && (
          <Link href="/designer/billing" className="text-xs text-brand hover:underline">
            🔒 {t("upgradeCta")}
          </Link>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={!canStudio}
          onClick={() => setModal("template")}
        >
          {t("saveTemplate")}
        </Button>
        <Button variant="ghost" size="sm" disabled={!canStudio} onClick={() => setModal("set")}>
          {t("saveSet")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!canStudio || sets.length === 0}
          onClick={() => setModal("apply")}
        >
          {t("applySet")}
        </Button>
      </div>

      {toast && <p className="mt-3 text-sm font-medium text-ok">{toast}</p>}

      <Modal
        open={modal === "template" || modal === "set"}
        onClose={() => setModal(null)}
        title={modal === "template" ? t("saveTemplate") : t("saveSet")}
      >
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            {t("nameLabel")}
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={modal === "template" ? t("templateNamePh") : t("setNamePh")}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModal(null)}>
              {t("cancel")}
            </Button>
            <Button
              disabled={pending || !name.trim()}
              onClick={() => run(modal === "template" ? "template" : "set")}
            >
              {pending ? t("saving") : t("save")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === "apply"} onClose={() => setModal(null)} title={t("applySet")}>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            {t("chooseSet")}
            <select
              value={setId}
              onChange={(e) => setSetId(e.target.value)}
              className="rounded-sm border border-line-2 bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
            >
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-mut">{t("applyHint")}</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModal(null)}>
              {t("cancel")}
            </Button>
            <Button disabled={pending || !setId} onClick={() => run("apply")}>
              {pending ? t("applying") : t("apply")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
