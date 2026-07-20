import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson, tooManyRequests } from "@/lib/http";
import { RULES, consume } from "@/lib/rate-limit";
import { requireSeller } from "@/lib/seller/context";
import {
  createDraftMaterials,
  importRowsSchema,
} from "@/lib/materials/import-service";

const bodySchema = z.object({ rows: importRowsSchema });

// POST /api/seller/import/create — save reviewed rows as DRAFT materials.
export async function POST(request: Request) {
  const guard = await requireSeller({ materials: true });
  if (!guard.ok) return guard.response;

  const rl = consume(`importParse:${guard.ctx.userId}`, RULES.importParse);
  if (!rl.allowed) return tooManyRequests(rl.retryAfterSec);

  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("invalid_input", "Validation failed", 422);

  const result = await createDraftMaterials(guard.ctx, parsed.data.rows);
  return NextResponse.json(result, { status: 201 });
}
