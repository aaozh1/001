import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Card } from "@/components/ui";
import { canManageProjects } from "@/lib/permissions";
import { getDesignerContext, getProject } from "@/lib/projects/service";
import { isProjectStatus } from "@/lib/projects/status";
import { deriveSpecStatus, rfqFlags } from "@/lib/spec/status";
import { type BoardLayout, boardLayoutSchema } from "@/lib/spec/board";
import { getMaterialsByIds } from "@/lib/materials/service";
import { listSpecBooks } from "@/lib/spec-book/service";
import { getRfqStatusMap, getRfqTrackingMap } from "@/lib/rfq/service";
import { getProjectQuotes } from "@/lib/quote/service";
import { getSubscription } from "@/lib/billing/service";
import { canUseMaterialSets } from "@/lib/templates/logic";
import { listMaterialSets } from "@/lib/templates/service";
import { ProjectStatusBadge } from "../_components/project-status-badge";
import { EditProjectButton } from "../_components/edit-project-button";
import { SpecViews } from "./_components/spec-views";
import type { SpecRow } from "./_components/types";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectDetailPage({ params }: Props) {
  const session = await auth();
  const ctx = session?.user?.id
    ? await getDesignerContext(session.user.id)
    : null;
  if (!ctx) redirect("/designer");

  const { id } = await params;
  const project = await getProject(ctx.orgId, id);
  if (!project) notFound();

  const t = await getTranslations("projects");
  const canManage = canManageProjects(ctx.role);
  const status = isProjectStatus(project.status) ? project.status : "active";

  // Resolve material summaries for every option across the schedule.
  const optionMaterialIds = project.specItems.flatMap((i) =>
    i.options.map((o) => o.materialId),
  );
  const [materials, rfqMap, quotesMap, trackingMap] = await Promise.all([
    getMaterialsByIds(optionMaterialIds),
    getRfqStatusMap(project.id),
    getProjectQuotes(ctx.orgId, project.id),
    getRfqTrackingMap(ctx.orgId, project.id),
  ]);

  const rows: SpecRow[] = project.specItems.map((item) => {
    const rfqState = rfqMap.get(item.id);
    const group = quotesMap.get(item.id);
    return {
      id: item.id,
      code: item.code,
      zone: item.zone ?? "",
      category: item.category ?? "",
      qty: item.qty ? item.qty.toString() : "",
      qtyUnit: item.qtyUnit ?? "",
      confirmedMaterialId: item.confirmedMaterialId,
      status: deriveSpecStatus({
        confirmedMaterialId: item.confirmedMaterialId,
        optionCount: item._count.options,
        ...rfqFlags(rfqState),
      }),
      options: item.options.map((o) => {
        const m = materials.get(o.materialId);
        return {
          materialId: o.materialId,
          name: m?.nameTh ?? "—",
          brand: m?.brand ?? null,
          model: m?.model ?? null,
          category: m?.category ?? item.category ?? "",
          swatchHex: m?.swatchHex ?? null,
          image: m?.image ?? null,
          isConfirmed: o.isConfirmed,
          price: m?.price ?? null,
          unit: m?.unit ?? null,
          leadTime: m?.leadTime ?? null,
          warranty: m?.warranty ?? null,
          cert: m?.cert ?? null,
        };
      }),
      rfq: {
        state: rfqState ?? "none",
        rfqId: group?.rfqId ?? null,
        rfqStatus: group?.rfqStatus ?? null,
        tracking: trackingMap.get(item.id) ?? [],
        quotes: (group?.quotes ?? []).map((q) => ({
          quoteId: q.quoteId,
          sellerOrgId: q.sellerOrgId,
          sellerName: q.sellerName,
          pricePerUnit: q.pricePerUnit,
          projectDiscount: q.projectDiscount,
          leadTime: q.leadTime,
          paymentTerms: q.paymentTerms,
          validUntil: q.validUntil,
          includeSample: q.includeSample,
          status: q.status,
        })),
      },
    };
  });

  const locale = await getLocale();
  const dateFmt = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    dateStyle: "medium",
  });
  const [bookRows, sub, materialSets] = await Promise.all([
    listSpecBooks(ctx.orgId, id),
    getSubscription(ctx.orgId),
    listMaterialSets(ctx.orgId),
  ]);
  const bookVersions = (bookRows ?? []).map((b) => ({
    version: b.version,
    dateLabel: dateFmt.format(b.createdAt),
    shareToken: b.shareToken,
  }));

  // Stored board layout (tolerant parse — junk becomes "no layout").
  const parsedLayout = boardLayoutSchema.safeParse(project.boardLayout);
  const boardLayout: BoardLayout | null = parsedLayout.success ? parsedLayout.data : null;

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/designer/projects" className="text-sm text-sub hover:text-ink">
        {t("back")}
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              {project.name}
            </h1>
            <ProjectStatusBadge status={status} />
          </div>
          <p className="mt-1 text-sub">
            {project.buildingType ?? "—"} · {project._count.specItems}{" "}
            {t("items")}
          </p>
        </div>
        {canManage && (
          <EditProjectButton
            project={{
              id: project.id,
              name: project.name,
              buildingType: project.buildingType,
              status,
            }}
          />
        )}
      </header>

      {!canManage && <p className="mt-3 text-xs text-mut">👁 {t("viewerHint")}</p>}

      <Card className="mt-4" padded={false}>
        <SpecViews
          projectId={project.id}
          canManage={canManage}
          items={rows}
          canStudio={canUseMaterialSets(sub.plan)}
          sets={materialSets.map((s) => ({ id: s.id, name: s.name }))}
          books={bookVersions}
          boardLayout={boardLayout}
        />
      </Card>

      <p className="mt-3 text-xs text-mut">🔒 {t("rfqToolbarHint")}</p>
    </div>
  );
}
