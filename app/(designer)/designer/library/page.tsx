import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Badge, Card } from "@/components/ui";
import { canManageProjects } from "@/lib/permissions";
import { getDesignerContext } from "@/lib/projects/service";
import { getSubscription } from "@/lib/billing/service";
import { canUseTemplates } from "@/lib/templates/logic";
import { listMaterialSets, listTemplates } from "@/lib/templates/service";
import { DeleteButton, UseTemplateButton } from "./_components/library-actions";
import { EditTemplateButton } from "./_components/edit-template-button";

// Library — templates + material sets (Studio features, ROADMAP 3.2). The
// lists are visible on any plan so the value is discoverable; every action is
// locked below Studio, and the server enforces the same gate.
export default async function LibraryPage() {
  const session = await auth();
  const ctx = session?.user?.id ? await getDesignerContext(session.user.id) : null;
  if (!ctx) redirect("/login?callbackUrl=/designer/library");

  const [t, sub, templates, sets] = await Promise.all([
    getTranslations("library"),
    getSubscription(ctx.orgId),
    listTemplates(ctx.orgId),
    listMaterialSets(ctx.orgId),
  ]);
  const studio = canUseTemplates(sub.plan);
  const canManage = canManageProjects(ctx.role);
  const actionable = studio && canManage;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{t("title")}</h1>
          <p className="mt-1 text-sub">{t("subtitle")}</p>
        </div>
        {/* 3I: Studio-feature chip, mono like the mock */}
        <span className="rounded-pill bg-canvas-2 px-3 py-1 font-mono text-[13.75px] uppercase tracking-[.08em] text-sub">
          {t("studioChip")}
        </span>
      </header>

      {/* 3J: lock card for non-Studio plans — the lists stay visible (dimmed)
          so the value is discoverable; the server enforces the real gate. */}
      {!studio && (
        <div className="mb-6 flex flex-col items-center rounded-card border border-line bg-surface p-8 text-center shadow-soft">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-lg">
            🔒
          </span>
          <h2 className="mt-3 text-lg font-bold text-ink">{t("lockedBanner")}</h2>
          <p className="mt-1 max-w-md text-sm text-sub">{t("lockedBody")}</p>
          <Link
            href="/designer/billing"
            className="mt-4 rounded-sm bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-deep"
          >
            {t("upgradeCta")} →
          </Link>
        </div>
      )}

      <div className={`grid gap-8 lg:grid-cols-2 ${!studio ? "opacity-70" : ""}`}>
      <section>
        <h2 className="mb-3 font-semibold text-ink">{t("templates")}</h2>
        {templates.length === 0 ? (
          <p className="rounded-card border border-dashed border-line-2 bg-surface p-8 text-center text-sub">
            {t("noTemplates")}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {templates.map((tp) => (
              <Card key={tp.id} className="flex-row items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{tp.name}</span>
                    {tp.isSystem && <Badge variant="neutral">{t("system")}</Badge>}
                  </div>
                  <p className="mt-0.5 text-sm text-sub">
                    {tp.buildingType ?? "—"} · {tp.lineCount} {t("lines")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <UseTemplateButton templateId={tp.id} disabled={!actionable} />
                  <EditTemplateButton
                    templateId={tp.id}
                    name={tp.name}
                    lines={tp.lines}
                    isSystem={tp.isSystem}
                    disabled={!actionable}
                  />
                  {!tp.isSystem && (
                    <DeleteButton
                      url={`/api/templates/${tp.id}`}
                      disabled={!actionable}
                      confirmText={t("deleteTemplateConfirm")}
                    />
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-ink">{t("sets")}</h2>
        <div className="flex flex-col gap-3">
          {sets.map((s) => (
            <Card key={s.id} className="gap-2.5">
              <div className="flex items-center justify-between gap-4">
                <span className="font-semibold text-ink">{s.name}</span>
                <DeleteButton
                  url={`/api/material-sets/${s.id}`}
                  disabled={!actionable}
                  confirmText={t("deleteSetConfirm")}
                />
              </div>
              {/* 3I: color swatch tiles, the mock's palette strip */}
              <div className="flex flex-wrap items-center gap-1.5">
                {s.materials.slice(0, 6).map((m) => (
                  <span
                    key={m.id}
                    title={m.name}
                    className="h-10 w-10 rounded-[9px] border border-line"
                    style={{ backgroundColor: m.swatchHex ?? "#e0d9cb" }}
                  />
                ))}
                {s.materials.length > 6 && (
                  <span className="flex h-10 w-10 items-center justify-center rounded-[9px] border border-line bg-canvas font-mono text-xs text-mut">
                    +{s.materials.length - 6}
                  </span>
                )}
              </div>
              <p className="text-xs text-mut">{t("applyFromProject")}</p>
            </Card>
          ))}
          {/* Dashed save-from-project hint box (mock) */}
          <Link
            href="/designer/projects"
            className="flex min-h-16 items-center justify-center rounded-card border border-dashed border-line-3 px-4 text-center text-sm text-mut transition hover:border-brand hover:text-brand"
          >
            ＋ {t("saveSetHint")}
          </Link>
        </div>
      </section>
      </div>
    </div>
  );
}
