"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Swatch } from "@/components/ui";
import { cn } from "@/lib/ui/cn";
import { categoryTexture } from "@/lib/materials/categories";
import { MAX_SPEC_OPTIONS } from "@/lib/spec/options";
import {
  addOptionAction,
  clearConfirmationAction,
  confirmMaterialAction,
  removeOptionAction,
} from "@/lib/spec/option-actions";
import { MaterialPickerModal } from "./material-picker-modal";
import type { OptionView } from "./types";

// Option compare panel — options side by side with their facts lined up, so
// confirming a material is a real comparison, not a blind click.
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
  const [failed, setFailed] = useState(false);

  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      setFailed(false);
      try {
        await fn();
      } catch {
        setFailed(true);
      }
    });
  const atLimit = options.length >= MAX_SPEC_OPTIONS;

  if (options.length === 0 && !canManage) {
    return <p className="px-4 py-3 text-sm text-sub">{t("noOptions")}</p>;
  }

  const facts: {
    label: string;
    value: (o: OptionView) => string | null;
  }[] = [
    { label: t("mcol_brand"), value: (o) => [o.brand, o.model].filter(Boolean).join(" · ") || null },
    { label: t("mcol_price"), value: (o) => (o.price ? `฿${o.price}${o.unit ? `/${o.unit}` : ""}` : null) },
    { label: t("mcol_leadTime"), value: (o) => o.leadTime },
    { label: t("mcol_warranty"), value: (o) => o.warranty },
    { label: t("mcol_cert"), value: (o) => o.cert },
  ];

  return (
    <div className={cn("flex flex-col gap-2 px-4 py-3", pending && "opacity-70")}>
      {options.length === 0 ? (
        <p className="text-sm text-sub">{t("noOptions")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[420px] text-sm">
            <thead>
              <tr>
                <th className="w-28 min-w-28 px-2 pb-2 text-left align-bottom text-xs font-medium text-mut">
                  {t("compareOptions", { n: options.length })}
                </th>
                {options.map((o) => (
                  <th key={o.materialId} className="min-w-40 px-2 pb-2 text-left align-bottom">
                    <div
                      className={cn(
                        "relative overflow-hidden rounded-card border",
                        o.isConfirmed ? "border-ok ring-2 ring-ok" : "border-line-2",
                      )}
                    >
                      <Swatch
                        color={o.swatchHex ?? "#c9c2b4"}
                        texture={categoryTexture(o.category)}
                        className="h-16 rounded-none"
                      />
                      {o.isConfirmed && (
                        <span className="absolute right-1.5 top-1.5 rounded-pill bg-ok px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          ✓ {t("confirmed")}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 line-clamp-2 text-[13px] font-semibold text-ink">
                      {o.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {facts.map((f) => (
                <tr key={f.label} className="border-t border-line/70">
                  <td className="px-2 py-1.5 text-xs text-mut">{f.label}</td>
                  {options.map((o) => (
                    <td key={o.materialId} className="px-2 py-1.5 text-ink">
                      {f.value(o) || <span className="text-mut">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
              {canManage && (
                <tr className="border-t border-line/70">
                  <td className="px-2 py-2" />
                  {options.map((o) => (
                    <td key={o.materialId} className="px-2 py-2">
                      <div className="flex items-center gap-1.5">
                        {o.isConfirmed ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => run(() => clearConfirmationAction(projectId, itemId))}
                            title={t("unconfirm")}
                            className="rounded-pill bg-ok px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
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
                            className="rounded-pill border border-ok px-2.5 py-1.5 text-xs font-medium text-ok transition hover:bg-ok hover:text-white disabled:opacity-50"
                          >
                            {t("useThis")}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={pending}
                          aria-label={t("removeOption")}
                          title={t("removeOption")}
                          onClick={() =>
                            run(() => removeOptionAction(projectId, itemId, o.materialId))
                          }
                          className="rounded px-1.5 py-0.5 text-mut hover:text-brand disabled:opacity-50"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {failed && (
        <p className="text-sm text-warn" role="alert">
          {t("optionActionFailed")}
        </p>
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
