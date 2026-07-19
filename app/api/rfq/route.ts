import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { jsonError, readJson } from "@/lib/http";
import { requireDesigner } from "@/lib/projects/guard";
import { prisma } from "@/lib/db";
import { getDesignerContext } from "@/lib/projects/service";
import { sendRfqSchema } from "@/lib/rfq/schemas";
import { listDesignerRfqs, listSellerRfqs, sendRfqs } from "@/lib/rfq/service";

// POST /api/rfq — designer sends RFQs for the selected spec lines (owner/editor).
export async function POST(request: Request) {
  const guard = await requireDesigner({ manage: true });
  if (!guard.ok) return guard.response;

  const parsed = sendRfqSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("invalid_input", "Validation failed", 422);

  const deadline = parsed.data.deadline ? new Date(parsed.data.deadline) : null;
  const result = await sendRfqs(
    guard.ctx,
    {
      specItemIds: parsed.data.itemIds,
      deadline,
      note: parsed.data.note ?? null,
      wantSample: parsed.data.wantSample ?? false,
    },
    new Date(),
  );
  return NextResponse.json(result, { status: 201 });
}

// GET /api/rfq — role-filtered: designer sees own; seller sees received
// (privacy-safe, no designer contact — rule #4).
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return jsonError("unauthorized", "Login required", 401);

  const designer = await getDesignerContext(session.user.id);
  if (designer) {
    return NextResponse.json({ rfqs: await listDesignerRfqs(designer.orgId), role: "designer" });
  }

  const sellerMembership = await prisma.membership.findFirst({
    where: { userId: session.user.id, org: { type: "seller" } },
    select: { orgId: true },
  });
  if (sellerMembership) {
    return NextResponse.json({
      rfqs: await listSellerRfqs(sellerMembership.orgId),
      role: "seller",
    });
  }

  return jsonError("forbidden", "No workspace", 403);
}
