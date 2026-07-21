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
  projectRows: ProjectRow[];
}

export interface AttentionProject {
  id: string;
  name: string;
  optionsPending: number;
  quotesToReview: number;
}

// 2B "Active projects" rows — every active project with its specified/pending
// counts, newest work first.
export interface ProjectRow {
  id: string;
  name: string;
  lineItems: number;
  confirmed: number;
  optionsPending: number;
  quotesToReview: number;
  updatedAt: Date;
}

// 2B "Recent quote activity" feed — the latest quotes landing across the org.
export interface QuoteActivity {
  sellerName: string;
  code: string;
  projectName: string;
  priceLabel: string;
  status: string;
  at: Date;
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
      prisma.rFQ.count({
        where: { project: { orgId, status: "active" }, status: "quoted" },
      }),
      prisma.rFQ.count({
        where: { project: { orgId, status: "active" }, status: "open" },
      }),
      prisma.project.findMany({
        where: { orgId, status: "active" },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          updatedAt: true,
          specItems: { select: { confirmedMaterialId: true, options: { select: { id: true }, take: 1 } } },
          rfqs: { where: { status: "quoted" }, select: { id: true } },
        },
      }),
    ]);

  const rows: ProjectRow[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    updatedAt: p.updatedAt,
    lineItems: p.specItems.length,
    confirmed: p.specItems.filter((s) => s.confirmedMaterialId != null).length,
    optionsPending: p.specItems.filter(
      (s) => s.confirmedMaterialId == null && s.options.length > 0,
    ).length,
    quotesToReview: p.rfqs.length,
  }));

  const attention: AttentionProject[] = rows
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
    projectRows: rows,
  };
}

/** Latest quotes received across the org (2B activity feed). Fail-safe. */
export async function getQuoteActivity(orgId: string, limit = 5): Promise<QuoteActivity[]> {
  try {
    const quotes = await prisma.quote.findMany({
      where: { rfq: { project: { orgId } } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        pricePerUnit: true,
        status: true,
        createdAt: true,
        seller: { select: { name: true } },
        rfq: {
          select: {
            specItem: { select: { code: true, qtyUnit: true } },
            project: { select: { name: true } },
          },
        },
      },
    });
    return quotes.map((q) => ({
      sellerName: q.seller.name,
      code: q.rfq.specItem.code,
      projectName: q.rfq.project.name,
      priceLabel: `฿${Number(q.pricePerUnit).toLocaleString()}${
        q.rfq.specItem.qtyUnit ? `/${q.rfq.specItem.qtyUnit}` : ""
      }`,
      status: q.status,
      at: q.createdAt,
    }));
  } catch {
    return [];
  }
}

// ── Onboarding checklist (3 ก้าวแรกสู่ "aha moment") ───────────────────
export interface OnboardingChecklist {
  hasOption: boolean;
  hasRfq: boolean;
  hasSpecBook: boolean;
  done: boolean;
}

export async function getOnboardingChecklist(orgId: string): Promise<OnboardingChecklist> {
  const [optionCount, rfqCount, bookCount] = await Promise.all([
    prisma.specOption.count({ where: { specItem: { project: { orgId } } }, take: 1 }),
    prisma.rFQ.count({ where: { project: { orgId } }, take: 1 }),
    prisma.specBook.count({ where: { project: { orgId } }, take: 1 }),
  ]);
  const hasOption = optionCount > 0;
  const hasRfq = rfqCount > 0;
  const hasSpecBook = bookCount > 0;
  return { hasOption, hasRfq, hasSpecBook, done: hasOption && hasRfq && hasSpecBook };
}
