import { NextResponse } from "next/server";
import { jsonError, tooManyRequests } from "@/lib/http";
import { RULES, consume } from "@/lib/rate-limit";
import { requireSeller } from "@/lib/seller/context";
import { parseDelimited } from "@/lib/import/parse";
import { xlsxToRows } from "@/lib/import/xlsx";
import { pdfToText } from "@/lib/import/pdf";
import {
  detectMaterialColumns,
  extractCandidates,
  gridToDrafts,
  isValidMaterialMapping,
} from "@/lib/import/catalog-extract";

const MAX_ROWS = 200;
const MAX_FILE_BYTES = 15 * 1024 * 1024;

// POST /api/seller/import/parse — turn an uploaded catalog into editable draft
// rows. Tabular sources (.xlsx/.csv/paste) go through header mapping; PDF text
// goes through the heuristic extractor. Nothing is saved here.
export async function POST(request: Request) {
  const guard = await requireSeller({ materials: true });
  if (!guard.ok) return guard.response;

  const rl = consume(`importParse:${guard.ctx.userId}`, RULES.importParse);
  if (!rl.allowed) return tooManyRequests(rl.retryAfterSec);

  const ct = request.headers.get("content-type") ?? "";
  try {
    if (ct.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return jsonError("empty", "No file", 422);
      if (file.size > MAX_FILE_BYTES) return jsonError("too_large", "File too large", 413);
      const buf = Buffer.from(await file.arrayBuffer());
      const name = file.name.toLowerCase();

      if (name.endsWith(".pdf")) {
        const text = await pdfToText(buf);
        // A scanned (image-only) PDF has no text layer to read.
        if (text.replace(/\s/g, "").length < 40) {
          return jsonError("no_text", "PDF has no readable text layer", 422);
        }
        const rows = extractCandidates(text, MAX_ROWS);
        if (rows.length === 0) return jsonError("no_products", "No products detected", 422);
        return NextResponse.json({ kind: "candidates", rows });
      }

      const grid = name.endsWith(".xlsx")
        ? await xlsxToRows(buf)
        : parseDelimited(buf.toString("utf-8"));
      return gridResponse(grid);
    }

    const body = (await request.json().catch(() => null)) as { text?: string } | null;
    if (typeof body?.text !== "string" || body.text.trim() === "") {
      return jsonError("empty", "No data", 422);
    }
    // Pasted text: tab/comma tables map like a sheet; anything else goes
    // through the free-text extractor.
    const grid = parseDelimited(body.text);
    const looksTabular =
      grid.length >= 2 && grid[0].length >= 2 && isValidMaterialMapping(detectMaterialColumns(grid[0]));
    if (looksTabular) return gridResponse(grid);

    const rows = extractCandidates(body.text, MAX_ROWS);
    if (rows.length === 0) return jsonError("no_products", "No products detected", 422);
    return NextResponse.json({ kind: "candidates", rows });
  } catch {
    return jsonError("parse_failed", "Could not read the file", 422);
  }
}

function gridResponse(grid: string[][]) {
  if (grid.length < 2) return jsonError("empty", "No data rows", 422);
  const header = grid[0];
  const mapping = detectMaterialColumns(header);
  if (!isValidMaterialMapping(mapping)) {
    // Let the client show the header and ask the seller to map the name column.
    return NextResponse.json({
      kind: "grid",
      header,
      mapping,
      rows: [],
      needsMapping: true,
      raw: grid.slice(1, 1 + MAX_ROWS),
    });
  }
  const rows = gridToDrafts(grid.slice(1, 1 + MAX_ROWS), mapping);
  if (rows.length === 0) return jsonError("no_products", "No products detected", 422);
  return NextResponse.json({ kind: "grid", header, mapping, rows, needsMapping: false });
}
