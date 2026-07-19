import { NextResponse } from "next/server";
import { requireDesigner } from "@/lib/projects/guard";
import { listMaterialsForPicker } from "@/lib/materials/service";

// GET /api/materials?q=&category= — catalog slice for the option picker.
// Ordered strictly by data completeness then name (neutrality, rule #1).
export async function GET(request: Request) {
  const guard = await requireDesigner();
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const materials = await listMaterialsForPicker({
    query: url.searchParams.get("q") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
  });
  return NextResponse.json({ materials });
}
