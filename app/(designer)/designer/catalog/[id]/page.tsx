import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Badge, Card, Swatch } from "@/components/ui";
import { canManageProjects } from "@/lib/permissions";
import { getDesignerContext } from "@/lib/projects/service";
import { getMaterialDetail } from "@/lib/materials/service";
import { categoryLabel, categoryTexture } from "@/lib/materials/categories";
import { MaterialCard } from "../_components/material-card";
import { AddToProjectButton } from "../_components/add-to-project-button";

type Props = { params: Promise<{ id: string }> };

export default async function MaterialDetailPage({ params }: Props) {
  const { id } = await params;
  const m = await getMaterialDetail(id);
  if (!m) notFound();

  const session = await auth();
  const ctx = session?.user?.id ? await getDesignerContext(session.user.id) : null;
  const canManage = !!ctx && canManageProjects(ctx.role);
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
      <Link href="/designer/catalog" className="text-sm text-sub hover:text-ink">
        {t("backCatalog")}
      </Link>

      <div className="mt-3 grid gap-6 sm:grid-cols-[260px_1fr]">
        <Card padded={false} className="h-fit">
          <Swatch
            color={m.swatchHex ?? "#c9c2b4"}
            texture={categoryTexture(m.category)}
            className="h-52 rounded-none"
          />
        </Card>

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

          {canManage && (
            <div className="mt-4">
              <AddToProjectButton materialId={m.id} variant="primary" size="md" />
            </div>
          )}
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
              <MaterialCard key={r.id} m={r} locale={locale} canManage={canManage} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
