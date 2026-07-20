"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Modal } from "@/components/ui";
import {
  addMaterialToItemAction,
  listAddTargetsAction,
  type AddTargetProject,
} from "@/lib/materials/actions";

export function AddToProjectButton({
  materialId,
  size = "sm",
  variant = "ghost",
}: {
  materialId: string;
  size?: "sm" | "md";
  variant?: "primary" | "ghost";
}) {
  const t = useTranslations("catalog");
  const [open, setOpen] = useState(false);
  const [targets, setTargets] = useState<AddTargetProject[] | null>(null);
  const [added, setAdded] = useState<Record<string, "ok" | "err">>({});
  const [pending, startTransition] = useTransition();

  function openModal() {
    setOpen(true);
    setAdded({});
    startTransition(async () => setTargets(await listAddTargetsAction()));
  }

  function add(projectId: string, itemId: string) {
    startTransition(async () => {
      const r = await addMaterialToItemAction(projectId, itemId, materialId);
      setAdded((prev) => ({ ...prev, [itemId]: r.ok ? "ok" : "err" }));
      // refresh option counts
      setTargets(await listAddTargetsAction());
    });
  }

  return (
    <>
      <Button variant={variant} size={size} onClick={openModal}>
        {t("addToProject")}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("pickProject")}>
        <p className="text-sm text-sub">{t("pickHint")}</p>

        {targets === null ? (
          <p className="py-6 text-center text-sm text-mut">…</p>
        ) : targets.length === 0 ? (
          <p className="py-6 text-center text-sm text-sub">
            {t("noProjects")}{" "}
            <Link href="/designer/projects" className="font-medium text-brand hover:underline">
              {t("goCreateProject")}
            </Link>
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-4">
            {targets.map((p) => (
              <div key={p.id}>
                <div className="mb-1 text-sm font-semibold text-ink">{p.name}</div>
                {p.items.length === 0 ? (
                  <p className="text-xs text-mut">—</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {p.items.map((it) => {
                      const state = added[it.id];
                      const disabled = pending || it.full || state === "ok";
                      return (
                        <button
                          key={it.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => add(p.id, it.id)}
                          className="flex items-center justify-between gap-2 rounded-sm border border-line-2 px-3 py-2 text-left text-sm transition hover:border-brand disabled:opacity-60 disabled:hover:border-line-2"
                        >
                          <span className="text-ink">
                            <span className="font-medium">{it.code}</span>
                            {it.zone ? <span className="text-sub"> · {it.zone}</span> : null}
                          </span>
                          <span className="text-xs text-mut">
                            {state === "ok"
                              ? t("added")
                              : state === "err"
                                ? t("addFailed")
                                : it.full
                                  ? t("itemFull")
                                  : `${it.optionCount}/4`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("close")}
          </Button>
        </div>
      </Modal>
    </>
  );
}
