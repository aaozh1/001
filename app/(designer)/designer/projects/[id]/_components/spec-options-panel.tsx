"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Swatch } from "@/components/ui";
import { cn } from "@/lib/ui/cn";
import { MAX_SPEC_OPTIONS } from "@/lib/spec/options";
import {
  addOptionAction,
  clearConfirmationAction,
  confirmMaterialAction,
  removeOptionAction,
} from "@/lib/spec/option-actions";
import { MaterialPickerModal } from "./material-picker-modal";
import type { OptionView } from "./types";

export function SpecOptionsPanel({
  projectId,
  itemId,
  options,
  canManage,
}: {
  projectId: string;
  itemId: string;
  options: OptionView[];
  canManage: boolean;
}) {
  const t = useTranslations("projects");
  const [pending, startTransition] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);

  const run = (fn: () => Promise<unknown>) => startTransition(() => void fn());
  const atLimit = options.length >= MAX_SPEC_OPTIONS;

  if (options.length === 0 && !canManage) {
    return <p className="px-4 py-3 text-sm text-sub">{t("noOptions")}</p>;
  }

  return (
    <div className={cn("flex flex-col gap-2 px-4 py-3", pending && "opacity-70")}>
      {options.length === 0 ? (
        <p className="text-sm text-sub">{t("noOptions")}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((o) => (
            <div
              key={o.materialId}
              className={cn(
                "flex items-center gap-3 rounded-card border p-2",
                o.isConfirmed ? "border-ok bg-ok-soft" : "border-line-2 bg-surface",
              )}
            >
              <Swatch
                color={o.swatchHex ?? "#c9c2b4"}
                className="h-11 w-11 shrink-0 rounded-sm"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink">
                  {o.name}
                </div>
                <div className="truncate text-xs text-sub">
                  {[o.brand, o.model].filter(Boolean).join(" · ")}
                </div>
              </div>
              {canManage && (
                <div className="flex shrink-0 items-center gap-1">
                  {o.isConfirmed ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => clearConfirmationAction(projectId, itemId))}
                      className="rounded-pill bg-ok px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                    >
                      ✓ {t("confirmed")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(() => confirmMaterialAction(projectId, itemId, o.materialId))
                      }
                      className="rounded-pill border border-line-2 px-2 py-1 text-xs font-medium text-sub hover:border-ok hover:text-ok disabled:opacity-50"
                    >
                      {t("useThis")}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={pending}
                    aria-label={t("removeOption")}
                    onClick={() =>
                      run(() => removeOptionAction(projectId, itemId, o.materialId))
                    }
                    className="rounded px-1.5 py-0.5 text-mut hover:text-brand disabled:opacity-50"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <div>
          {atLimit ? (
            <span className="text-xs text-mut">{t("optionLimit")}</span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => setPickerOpen(true)}
            >
              {t("addOption")}
            </Button>
          )}
        </div>
      )}

      <MaterialPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        existingIds={options.map((o) => o.materialId)}
        pending={pending}
        onPick={(materialId) => {
          setPickerOpen(false);
          run(() => addOptionAction(projectId, itemId, materialId));
        }}
      />
    </div>
  );
}
