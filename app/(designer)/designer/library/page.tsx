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
    <div className="mx-auto max-w-4xl">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-1 text-sub">{t("subtitle")}</p>
      </header>

      {!studio && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-brand-soft p-4">
          <p className="text-sm text-ink">🔒 {t("lockedBanner")}</p>
          <Link href="/designer/billing" className="text-sm font-medium text-brand hover:underline">
            {t("upgradeCta")} →
          </Link>
        </div>
      )}

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

      <section className="mt-8">
        <h2 className="mb-3 font-semibold text-ink">{t("sets")}</h2>
        {sets.length === 0 ? (
          <p className="rounded-card border border-dashed border-line-2 bg-surface p-8 text-center text-sub">
            {t("noSets")}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {sets.map((s) => (
              <Card key={s.id} className="gap-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-ink">{s.name}</span>
                  <DeleteButton
                    url={`/api/material-sets/${s.id}`}
                    disabled={!actionable}
                    confirmText={t("deleteSetConfirm")}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {s.materials.map((m) => (
                    <span
                      key={m.id}
                      className="rounded-pill border border-line bg-canvas px-2 py-0.5 text-xs text-sub"
                    >
                      {m.name}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-mut">{t("applyFromProject")}</p>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
