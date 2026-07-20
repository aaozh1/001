"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Modal } from "@/components/ui";
import { cn } from "@/lib/ui/cn";

export interface SetOption {
  id: string;
  name: string;
}

type Screen = "menu" | "template" | "set" | "apply";

// Studio tools — an icon button above the Material List; the modal offers
// save-template / save-set / apply-set. Locked (with an upgrade pointer)
// below the Studio plan — the server enforces the same gate.
export function StudioToolsModal({
  open,
  onClose,
  projectId,
  canStudio,
  sets,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  canStudio: boolean;
  sets: SetOption[];
}) {
  const t = useTranslations("library");
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("menu");
  const [name, setName] = useState("");
  const [setId, setSetId] = useState(sets[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<{ text: string; kind: "ok" | "error" } | null>(null);

  function close() {
    setScreen("menu");
    setToast(null);
    setName("");
    onClose();
  }

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
          setToast({ text: t("appliedToast", { added: data.added }), kind: "ok" });
        } else {
          setToast({
            text: t(kind === "template" ? "templateSaved" : "setSaved"),
            kind: "ok",
          });
        }
        // Refresh so a just-saved set immediately appears in "apply" choices
        // and applied options show up in the schedule.
        router.refresh();
        setScreen("menu");
        setName("");
      } else {
        const data = (await res.json().catch(() => null)) as
          | { error?: { code?: string } }
          | null;
        setToast({
          text: data?.error?.code === "studio_required" ? t("lockedShort") : t("failed"),
          kind: "error",
        });
      }
    } catch {
      setToast({ text: t("failed"), kind: "error" });
    } finally {
      setPending(false);
    }
  }

  const menuBtn =
    "flex w-full items-center justify-between gap-3 rounded-card border border-line-2 bg-surface px-4 py-3 text-left text-sm font-medium text-ink transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <Modal open={open} onClose={close} title={`🧰 ${t("studioTools")}`}>
      {screen === "menu" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-mut">{t("studioToolsHint")}</p>
            {!canStudio && (
              <Link href="/designer/billing" className="text-xs text-brand hover:underline">
                🔒 {t("upgradeCta")}
              </Link>
            )}
          </div>
          <button type="button" disabled={!canStudio} onClick={() => setScreen("template")} className={menuBtn}>
            <span>🧩 {t("saveTemplate")}</span>
            <span className="text-mut">→</span>
          </button>
          <button type="button" disabled={!canStudio} onClick={() => setScreen("set")} className={menuBtn}>
            <span>🎨 {t("saveSet")}</span>
            <span className="text-mut">→</span>
          </button>
          <button
            type="button"
            disabled={!canStudio || sets.length === 0}
            onClick={() => setScreen("apply")}
            className={menuBtn}
          >
            <span>✨ {t("applySet")}</span>
            <span className="text-mut">→</span>
          </button>
          {toast && (
            <p
              role={toast.kind === "error" ? "alert" : undefined}
              className={cn(
                "text-sm font-medium",
                toast.kind === "ok" ? "text-ok" : "text-warn",
              )}
            >
              {toast.text}
            </p>
          )}
        </div>
      )}

      {(screen === "template" || screen === "set") && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            {t("nameLabel")}
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={screen === "template" ? t("templateNamePh") : t("setNamePh")}
            />
          </label>
          {toast?.kind === "error" && (
            <p className="text-sm text-warn" role="alert">
              {toast.text}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setScreen("menu")}>
              {t("cancel")}
            </Button>
            <Button disabled={pending || !name.trim()} onClick={() => run(screen)}>
              {pending ? t("saving") : t("save")}
            </Button>
          </div>
        </div>
      )}

      {screen === "apply" && (
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
          {toast?.kind === "error" && (
            <p className="text-sm text-warn" role="alert">
              {toast.text}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setScreen("menu")}>
              {t("cancel")}
            </Button>
            <Button disabled={pending || !setId} onClick={() => run("apply")}>
              {pending ? t("applying") : t("apply")}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
