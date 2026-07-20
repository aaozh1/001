import { NextResponse } from "next/server";
import { jsonError, tooManyRequests } from "@/lib/http";
import { RULES, consume } from "@/lib/rate-limit";
import { requireDesigner } from "@/lib/projects/guard";
import {
  detectColumns,
  fingerprintHeader,
  isValidMapping,
  parseDelimited,
} from "@/lib/import/parse";
import { xlsxToRows } from "@/lib/import/xlsx";
import { getSavedMapping } from "@/lib/import/service";

const MAX_PREVIEW_ROWS = 1000;

async function readGrid(request: Request): Promise<string[][] | null> {
  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return null;
    const buf = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();
    if (name.endsWith(".xlsx")) return xlsxToRows(buf);
    return parseDelimited(buf.toString("utf-8")); // .csv / .tsv / .txt
  }
  const body = (await request.json().catch(() => null)) as { text?: string } | null;
  if (typeof body?.text !== "string") return null;
  return parseDelimited(body.text);
}

// POST /api/import/parse — text or .xlsx/.csv → header + rows + column mapping.
export async function POST(request: Request) {
  const guard = await requireDesigner({ manage: true });
  if (!guard.ok) return guard.response;

  const rl = consume(`importParse:${guard.ctx.userId}`, RULES.importParse);
  if (!rl.allowed) return tooManyRequests(rl.retryAfterSec);

  let grid: string[][] | null;
  try {
    grid = await readGrid(request);
  } catch {
    grid = null;
  }
  if (!grid || grid.length === 0) {
    return jsonError("empty", "No data to import", 422);
  }

  const header = grid[0];
  const rows = grid.slice(1, 1 + MAX_PREVIEW_ROWS);
  const detected = detectColumns(header);
  const saved = await getSavedMapping(guard.ctx.orgId, fingerprintHeader(header));
  const savedApplied = !!saved && isValidMapping(saved);

  return NextResponse.json({
    header,
    rows,
    totalRows: grid.length - 1,
    mapping: savedApplied ? saved : detected,
    savedApplied,
  });
}
