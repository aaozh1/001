import { getLocale } from "next-intl/server";
import { jsonError } from "@/lib/http";
import { requireDesigner } from "@/lib/projects/guard";
import { getSpecBookSnapshot } from "@/lib/spec-book/service";
import { renderSpecBookPdf } from "@/lib/spec-book/pdf";

type Params = { params: Promise<{ id: string; version: string }> };

// GET /api/projects/:id/spec-book/:version/pdf — render the frozen snapshot.
export async function GET(_request: Request, { params }: Params) {
  const guard = await requireDesigner();
  if (!guard.ok) return guard.response;

  const { id, version } = await params;
  const v = Number(version);
  if (!Number.isInteger(v) || v < 1) return jsonError("invalid", "Bad version", 400);

  const snapshot = await getSpecBookSnapshot(guard.ctx.orgId, id, v);
  if (!snapshot) return jsonError("not_found", "Spec Book not found", 404);

  const locale = (await getLocale()) === "en" ? "en" : "th";
  const pdf = await renderSpecBookPdf(snapshot, { version: v, locale });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="specbook-v${v}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
