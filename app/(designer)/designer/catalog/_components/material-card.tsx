import Link from "next/link";
import { Card, Swatch } from "@/components/ui";
import { categoryTexture } from "@/lib/materials/categories";
import type { MaterialSummary } from "@/lib/materials/service";
import { AddToProjectButton } from "./add-to-project-button";

// One catalog result. `locale` picks the TH/EN name + spec summary.
export function MaterialCard({
  m,
  locale,
  canManage,
}: {
  m: MaterialSummary;
  locale: string;
  canManage: boolean;
}) {
  const name = locale === "en" && m.nameEn ? m.nameEn : m.nameTh;
  const spec = locale === "en" && m.specEn ? m.specEn : m.specTh;
  return (
    <Card padded={false} interactive className="overflow-hidden">
      <Link href={`/designer/catalog/${m.id}`}>
        <Swatch
          color={m.swatchHex ?? "#c9c2b4"}
          texture={categoryTexture(m.category)}
          className="rounded-none"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-[14px]">
        <Link
          href={`/designer/catalog/${m.id}`}
          className="text-sm font-semibold text-ink hover:text-brand"
        >
          {name}
        </Link>
        <div className="text-xs text-sub">
          {[m.brand, m.model].filter(Boolean).join(" · ")}
        </div>
        {spec && <div className="text-xs text-mut">{spec}</div>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="text-sm font-bold text-brand">
            {m.price ? `฿${m.price}${m.unit ? `/${m.unit}` : ""}` : ""}
          </span>
          {canManage && <AddToProjectButton materialId={m.id} />}
        </div>
      </div>
    </Card>
  );
}
