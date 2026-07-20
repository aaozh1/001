import "server-only";
import { prisma } from "@/lib/db";

// Designer dashboard aggregation. The prototype's "My Work" surface answers one
// question: what needs my attention right now? We compute three actionable
// buckets across the org's active projects, plus a short list of the projects
// that carry that work.

export interface DashboardSummary {
  activeProjects: number;
  /** Spec lines with options collected but no material confirmed yet. */
  optionsPending: number;
  /** RFQs that have quotes in and await compare/select. */
  quotesToReview: number;
  /** RFQs sent and still waiting on sellers. */
  awaitingQuotes: number;
  /** VE Finder savings — feature lands later; 0 until then. */
  veSavingsThb: number;
  veSwaps: number;
  attention: AttentionProject[];
}

export interface AttentionProject {
  id: string;
  name: string;
  optionsPending: number;
  quotesToReview: number;
}

export async function getDesignerDashboard(orgId: string): Promise<DashboardSummary> {
  const [activeProjects, optionsPending, quotesToReview, awaitingQuotes, projects] =
    await Promise.all([
      prisma.project.count({ where: { orgId, status: "active" } }),
      // Spec lines with ≥1 option but nothing confirmed.
      prisma.specItem.count({
        where: {
          project: { orgId, status: "active" },
          confirmedMaterialId: null,
          options: { some: {} },
        },
      }),
      prisma.rFQ.count({ where: { project: { orgId }, status: "quoted" } }),
      prisma.rFQ.count({ where: { project: { orgId }, status: "open" } }),
      prisma.project.findMany({
        where: { orgId, status: "active" },
        select: {
          id: true,
          name: true,
          specItems: {
            where: { confirmedMaterialId: null, options: { some: {} } },
            select: { id: true },
          },
          rfqs: { where: { status: "quoted" }, select: { id: true } },
        },
      }),
    ]);

  const attention: AttentionProject[] = projects
    .map((p) => ({
      id: p.id,
      name: p.name,
      optionsPending: p.specItems.length,
      quotesToReview: p.rfqs.length,
    }))
    .filter((p) => p.optionsPending > 0 || p.quotesToReview > 0)
    .sort((a, b) => b.quotesToReview - a.quotesToReview || b.optionsPending - a.optionsPending);

  return {
    activeProjects,
    optionsPending,
    quotesToReview,
    awaitingQuotes,
    veSavingsThb: 0,
    veSwaps: 0,
    attention,
  };
}
