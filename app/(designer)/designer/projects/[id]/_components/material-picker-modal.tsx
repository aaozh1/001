"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Input, Modal, Swatch } from "@/components/ui";
import { searchMaterialsAction } from "@/lib/spec/option-actions";
import type { MaterialSummary } from "@/lib/materials/service";

export function MaterialPickerModal({
  open,
  onClose,
  onPick,
  existingIds,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (materialId: string) => void;
  existingIds: string[];
  pending: boolean;
}) {
  const t = useTranslations("projects");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MaterialSummary[]>([]);
  const [loading, startLoad] = useTransition();

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      startLoad(async () => setResults(await searchMaterialsAction(query)));
    }, 200);
    return () => clearTimeout(handle);
  }, [open, query]);

  return (
    <Modal open={open} onClose={onClose} title={t("pickTitle")} wide>
      <Input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("searchPlaceholder")}
      />
      <p className="mt-1 text-xs text-mut">{t("searchNeutral")}</p>

      <div className="mt-3 flex max-h-[52vh] flex-col gap-2 overflow-y-auto">
        {results.length === 0 && !loading ? (
          <p className="py-8 text-center text-sm text-sub">{t("noResults")}</p>
        ) : (
          results.map((m) => {
            const added = existingIds.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                disabled={added || pending}
                onClick={() => onPick(m.id)}
                className="flex items-center gap-3 rounded-card border border-line-2 p-2 text-left transition hover:border-brand disabled:opacity-50 disabled:hover:border-line-2"
              >
                <Swatch
                  color={m.swatchHex ?? "#c9c2b4"}
                  className="h-12 w-12 shrink-0 rounded-sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">
                    {m.nameTh}
                  </span>
                  <span className="block truncate text-xs text-sub">
                    {[m.brand, m.model].filter(Boolean).join(" · ")} · {m.category}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-sub">
                  {m.price ? `฿${m.price}${m.unit ? `/${m.unit}` : ""}` : ""}
                </span>
                {added && (
                  <span className="shrink-0 text-xs font-medium text-mut">
                    {t("alreadyAdded")}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </Modal>
  );
}
