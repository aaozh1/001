"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, Modal } from "@/components/ui";
import { MaterialVisual } from "@/app/_components/material-visual";
import type { MaterialSummary } from "@/lib/materials/service";
import { applyVeSwapAction, findVeAction } from "@/lib/ve/actions";

interface Suggestion {
  material: MaterialSummary;
  savingPercent: number;
  similarity: number;
}

// VE Finder — "หาตัวถูกกว่าที่สเปกใกล้เคียง" for a confirmed line. Ranked by
// spec similarity only (rule #1); the modal shows the facts side by side.
export function VeFinderButton({
  projectId,
  itemId,
  confirmedName,
}: {
  projectId: string;
  itemId: string;
  confirmedName: string;
}) {
  const t = useTranslations("ve");
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "gated" }
    | { kind: "error"; code: string }
    | { kind: "ready"; base: MaterialSummary; suggestions: Suggestion[] }
  >({ kind: "idle" });
  const [applying, setApplying] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  async function openFinder() {
    setOpen(true);
    setApplied(false);
    setState({ kind: "loading" });
    try {
      const r = await findVeAction(itemId);
      if (r.ok) setState({ kind: "ready", base: r.base, suggestions: r.suggestions });
      else if (r.error === "gated") setState({ kind: "gated" });
      else setState({ kind: "error", code: r.error });
    } catch {
      setState({ kind: "error", code: "failed" });
    }
  }

  async function apply(s: Suggestion, baseId: string) {
    if (applying) return;
    setApplying(s.material.id);
    try {
      const r = await applyVeSwapAction(
        projectId,
        itemId,
        baseId,
        s.material.id,
        s.savingPercent,
      );
      if (r.ok) {
        setApplied(true);
        setOpen(false);
      } else {
        setState({ kind: "error", code: r.error ?? "failed" });
      }
    } catch {
      setState({ kind: "error", code: "failed" });
    } finally {
      setApplying(null);
    }
  }

  const priceText = (m: MaterialSummary) =>
    m.price ? `฿${m.price}${m.unit ? `/${m.unit}` : ""}` : "—";

  return (
    <>
      <button
        type="button"
        onClick={() => void openFinder()}
        className="rounded-pill border border-brand px-2.5 py-1.5 text-xs font-medium text-brand transition hover:bg-brand hover:text-white"
      >
        💡 {t("cta")}
      </button>
      {applied && <span className="ml-2 text-xs font-medium text-ok">✓ {t("swapped")}</span>}

      <Modal open={open} onClose={() => setOpen(false)} title={`💡 ${t("title")}`} wide>
        {state.kind === "loading" && (
          <p className="py-8 text-center text-sm text-sub">{t("searching")}</p>
        )}

        {state.kind === "gated" && (
          <div className="flex flex-col items-start gap-3 py-2">
            <p className="text-sm text-ink">🔒 {t("gated")}</p>
            <Link
              href="/designer/billing"
              className="rounded-pill bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              {t("upgrade")} →
            </Link>
          </div>
        )}

        {state.kind === "error" && (
          <p className="py-4 text-sm text-warn" role="alert">
            {state.code === "no_price"
              ? t("errNoPrice")
              : state.code === "limit"
                ? t("errLimit")
                : t("errFailed")}
          </p>
        )}

        {state.kind === "ready" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-sub">
              {t("baseLine", { name: confirmedName, price: priceText(state.base) })}
            </p>
            <p className="text-xs text-mut">{t("neutralNote")}</p>

            {state.suggestions.length === 0 ? (
              <p className="rounded-card border border-dashed border-line-2 p-6 text-center text-sm text-sub">
                {t("noResults")}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {state.suggestions.map((s) => (
                  <div
                    key={s.material.id}
                    className="flex items-center gap-3 rounded-card border border-line bg-surface p-3"
                  >
                    <MaterialVisual
                      image={s.material.image}
                      swatchHex={s.material.swatchHex}
                      category={s.material.category}
                      alt={s.material.nameTh}
                      className="h-14 w-14 shrink-0 rounded-sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-ink">
                        {s.material.nameTh}
                      </div>
                      <div className="truncate text-xs text-sub">
                        {[s.material.brand, s.material.model].filter(Boolean).join(" · ")}
                        {s.material.specTh ? ` · ${s.material.specTh}` : ""}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-bold text-brand">{priceText(s.material)}</span>
                        <Badge variant="ok">
                          −{s.savingPercent}% {t("cheaper")}
                        </Badge>
                        <span className="text-mut">
                          {t("similarity")} {Math.round(s.similarity * 100)}%
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={applying !== null}
                      onClick={() => void apply(s, state.base.id)}
                    >
                      {applying === s.material.id ? t("applying") : t("useInstead")}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
