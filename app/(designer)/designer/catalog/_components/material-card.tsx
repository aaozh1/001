import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui";
import { cn } from "@/lib/ui/cn";
import { MaterialVisual } from "@/app/_components/material-visual";
import type { MaterialSummary } from "@/lib/materials/service";
import { AddToProjectButton } from "./add-to-project-button";

// One catalog result, laid out per design 2C: photo with a mono SKU chip,
// brand row with an initials tile, bold name, mono spec meta, then the mono
// price + compact "+ เพิ่ม" pill. `locale` picks the TH/EN name + spec.
export function MaterialCard({
  m,
  locale,
  addFallbackHref,
  basePath = "/designer/catalog",
  compareSelected = false,
  compareDisabled = false,
  onToggleCompare,
}: {
  m: MaterialSummary;
  locale: string;
  /** undefined when the viewer can add directly; a URL otherwise, so the
   *  "+ Add" button always renders the same regardless of sign-in state. */
  addFallbackHref?: string;
  /** Route prefix — the same card serves the designer and PUBLIC catalogs. */
  basePath?: string;
  /** Compare selection: whether this card is currently picked. */
  compareSelected?: boolean;
  /** Compare selection is full (max reached) and this card isn't in it. */
  compareDisabled?: boolean;
  /** When set, a compare checkbox shows on hover (top-right of the photo). */
  onToggleCompare?: () => void;
}) {
  const t = useTranslations("catalog");
  const name = locale === "en" && m.nameEn ? m.nameEn : m.nameTh;
  const spec = locale === "en" && m.specEn ? m.specEn : m.specTh;
  const meta = [m.size, spec].filter(Boolean).join(" · ");
  const brandInitials = m.brand
    ? m.brand
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : null;

  return (
    <Card
      padded={false}
      interactive
      className={cn("group relative", compareSelected && "ring-2 ring-brand")}
    >
      <Link href={`${basePath}/${m.id}`} className="relative block">
        <MaterialVisual
          image={m.image}
          swatchHex={m.swatchHex}
          category={m.category}
          alt={m.nameTh}
          className="rounded-none"
        />
        {/* 2C: SKU chip pinned on the photo, mono like the mock */}
        {m.sku && (
          <span className="absolute left-2 top-2 rounded-[6px] bg-white/92 px-1.5 py-0.5 font-mono text-[12.5px] text-ink-2 shadow-soft">
            {m.sku}
          </span>
        )}
      </Link>
      {/* Compare checkbox — top-right of the photo, always visible so it's
          discoverable on touch devices too (hover-only hides it on mobile).
          Sits above the photo Link so it never triggers navigation. */}
      {onToggleCompare && (
        <button
          type="button"
          role="checkbox"
          aria-checked={compareSelected}
          aria-label={t("compareAdd")}
          title={compareDisabled && !compareSelected ? t("compareMax") : t("compareAdd")}
          disabled={compareDisabled && !compareSelected}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleCompare();
          }}
          className={cn(
            "absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-[6px] border text-xs font-bold shadow-soft transition",
            compareSelected
              ? "border-brand bg-brand text-white"
              : "border-line-3 bg-white/90 text-transparent hover:border-brand hover:text-brand/40 disabled:cursor-not-allowed disabled:opacity-40",
          )}
        >
          ✓
        </button>
      )}
      <div className="flex flex-1 flex-col gap-1 p-[14px]">
        {brandInitials && (
          <div className="flex items-center gap-1.5 text-xs text-sub">
            <span className="flex h-4 w-4 items-center justify-center rounded-[4px] border border-line bg-canvas font-mono text-[10px] font-semibold text-mut">
              {brandInitials}
            </span>
            {m.brand}
          </div>
        )}
        <Link
          href={`${basePath}/${m.id}`}
          className="text-sm font-bold leading-snug text-ink hover:text-brand"
        >
          {name}
          {m.model ? <span className="font-semibold text-sub"> · {m.model}</span> : null}
        </Link>
        {meta && (
          <div className="truncate font-mono text-[13.75px] text-mut" title={meta}>
            {meta}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-2">
          <span className="font-mono text-[16.875px] font-semibold text-brand-deep">
            {m.price
              ? `฿${Number(m.price).toLocaleString()}${m.unit ? ` / ${m.unit}` : ""}`
              : ""}
          </span>
          <AddToProjectButton materialId={m.id} compact fallbackHref={addFallbackHref} />
        </div>
      </div>
    </Card>
  );
}
