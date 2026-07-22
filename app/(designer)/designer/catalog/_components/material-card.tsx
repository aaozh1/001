import Link from "next/link";
import { Card } from "@/components/ui";
import { MaterialVisual } from "@/app/_components/material-visual";
import type { MaterialSummary } from "@/lib/materials/service";
import { AddToProjectButton } from "./add-to-project-button";

// One catalog result, laid out per design 2C: photo with a mono SKU chip,
// brand row with an initials tile, bold name, mono spec meta, then the mono
// price + compact "+ เพิ่ม" pill. `locale` picks the TH/EN name + spec.
export function MaterialCard({
  m,
  locale,
  canManage,
  basePath = "/designer/catalog",
}: {
  m: MaterialSummary;
  locale: string;
  canManage: boolean;
  /** Route prefix — the same card serves the designer and PUBLIC catalogs. */
  basePath?: string;
}) {
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
    <Card padded={false} interactive className="overflow-hidden">
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
          <span className="absolute left-2 top-2 rounded-[6px] bg-white/92 px-1.5 py-0.5 font-mono text-[10px] text-ink-2 shadow-soft">
            {m.sku}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-[14px]">
        {brandInitials && (
          <div className="flex items-center gap-1.5 text-xs text-sub">
            <span className="flex h-4 w-4 items-center justify-center rounded-[4px] border border-line bg-canvas font-mono text-[8px] font-semibold text-mut">
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
          <div className="truncate font-mono text-[11px] text-mut" title={meta}>
            {meta}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="font-mono text-[13.5px] font-semibold text-brand-deep">
            {m.price
              ? `฿${Number(m.price).toLocaleString()}${m.unit ? ` / ${m.unit}` : ""}`
              : ""}
          </span>
          {canManage && <AddToProjectButton materialId={m.id} compact />}
        </div>
      </div>
    </Card>
  );
}
