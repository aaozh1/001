import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge, Card, Swatch } from "@/components/ui";
import { getMaterialDetail } from "@/lib/materials/service";
import { categoryLabel, categoryTexture } from "@/lib/materials/categories";
import { MaterialCard } from "@/app/(designer)/designer/catalog/_components/material-card";

// Material detail, shared by the designer catalog and the PUBLIC catalog.
// `actionSlot` is the per-surface CTA: add-to-project (designer) or a
// login prompt (public).
export async function MaterialDetailView({
  id,
  basePath,
  canManage,
  actionSlot,
}: {
  id: string;
  basePath: string;
  canManage: boolean;
  actionSlot?: React.ReactNode;
}) {
  const m = await getMaterialDetail(id);
  if (!m) notFound();

  const [t, locale] = await Promise.all([getTranslations("catalog"), getLocale()]);
  const name = locale === "en" && m.nameEn ? m.nameEn : m.nameTh;
  const spec = locale === "en" && m.specEn ? m.specEn : m.specTh;
  const note = locale === "en" && m.noteEn ? m.noteEn : m.noteTh;

  const facts: [string, string | null][] = [
    [t("std"), m.cert],
    [t("lead"), m.leadTime],
    [t("moq"), m.moq],
    [t("warranty"), m.warranty],
    [t("color"), m.color],
    [t("size"), m.size],
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <Link href={basePath} className="text-sm text-sub hover:text-ink">
        {t("backCatalog")}
      </Link>

      <div className="mt-3 grid gap-6 sm:grid-cols-[260px_1fr]">
        <div className="flex h-fit flex-col gap-2">
          <Card padded={false}>
            {m.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={m.images[0]}
                alt={name}
                className="block h-52 w-full rounded-card object-cover"
              />
            ) : (
              <Swatch
                color={m.swatchHex ?? "#c9c2b4"}
                texture={categoryTexture(m.category)}
                className="h-52 rounded-none"
              />
            )}
          </Card>
          {m.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {m.images.slice(1).map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img}
                  src={img}
                  alt={name}
                  loading="lazy"
                  className="h-14 w-full rounded-sm border border-line object-cover"
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-xs text-mut">{categoryLabel(m.category, locale)}</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">{name}</h1>
          <div className="mt-1 text-sub">
            {[m.brand, m.model, m.sku].filter(Boolean).join(" · ")}
          </div>
          {m.price && (
            <div className="mt-3 text-xl font-bold text-brand">
              ฿{m.price}
              {m.unit ? <span className="text-sm font-normal text-sub"> /{m.unit}</span> : null}
            </div>
          )}
          {spec && <p className="mt-3 text-sm text-ink">{spec}</p>}

          {actionSlot && <div className="mt-4">{actionSlot}</div>}
        </div>
      </div>

      <Card className="mt-6">
        <h2 className="mb-3 font-semibold text-ink">{t("detailSpec")}</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          {facts
            .filter(([, v]) => v && v !== "—")
            .map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-mut">{k}</dt>
                <dd className="text-ink">{v}</dd>
              </div>
            ))}
        </dl>
        {note && note !== "—" && (
          <p className="mt-4 border-t border-line pt-3 text-sm text-sub">
            <span className="font-medium text-ink">{t("note")}: </span>
            {note}
          </p>
        )}
      </Card>

      {m.seller && (
        <Card className="mt-4 flex-row items-center justify-between">
          <div>
            <div className="text-xs text-mut">{t("madeBy")}</div>
            <div className="font-medium text-ink">{m.seller.name}</div>
          </div>
          {m.seller.verified && <Badge variant="ok">✓ {t("verified")}</Badge>}
        </Card>
      )}

      {m.related.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-semibold text-ink">{t("related")}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {m.related.map((r) => (
              <MaterialCard
                key={r.id}
                m={r}
                locale={locale}
                canManage={canManage}
                basePath={basePath}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
