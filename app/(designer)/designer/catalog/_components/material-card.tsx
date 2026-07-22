import Link from "next/link";
import { Card } from "@/components/ui";
import { MaterialVisual } from "@/app/_components/material-visual";
import type { MaterialSummary } from "@/lib/materials/service";
import { AddToProjectButton } from "./add-to-project-button";

// One catalog result. `locale` picks the TH/EN name + spec summary.
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
      <div className="flex flex-1 flex-col gap-1.5 p-[14px]">
        <Link
          href={`${basePath}/${m.id}`}
          className="text-sm font-semibold text-ink hover:text-brand"
        >
          {name}
        </Link>
        <div className="text-xs text-sub">
          {[m.brand, m.model].filter(Boolean).join(" · ")}
        </div>
        {spec && <div className="text-xs text-mut">{spec}</div>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="font-mono text-[13px] font-semibold text-brand-deep">
            {m.price ? `฿${m.price}${m.unit ? `/${m.unit}` : ""}` : ""}
          </span>
          {canManage && <AddToProjectButton materialId={m.id} />}
        </div>
      </div>
    </Card>
  );
}
