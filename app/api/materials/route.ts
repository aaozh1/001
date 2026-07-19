import { NextResponse } from "next/server";
import { requireDesigner } from "@/lib/projects/guard";
import { searchCatalog } from "@/lib/materials/service";

// GET /api/materials?q=&category=&page= — catalog search.
// Ordered strictly by spec relevance then completeness (neutrality, rule #1).
export async function GET(request: Request) {
  const guard = await requireDesigner();
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const pageRaw = Number(url.searchParams.get("page"));
  const result = await searchCatalog({
    query: url.searchParams.get("q") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  });
  return NextResponse.json(result);
}
