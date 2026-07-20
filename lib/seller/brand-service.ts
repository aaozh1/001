import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { SellerContext } from "@/lib/seller/context";

// Brands (ROADMAP 3.4): a seller may distribute several brands; materials can
// point at one so the catalog shows "ผลิต/จัดจำหน่ายโดย". Org-scoped CRUD.

export const brandFormSchema = z.object({
  name: z.string().trim().min(1).max(120),
  logoUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  story: z.string().trim().max(1000).optional(),
});
export type BrandFormInput = z.infer<typeof brandFormSchema>;

export interface BrandRow {
  id: string;
  name: string;
  logoUrl: string | null;
  story: string | null;
  materialCount: number;
}

export async function listBrands(orgId: string): Promise<BrandRow[]> {
  const rows = await prisma.brand.findMany({
    where: { sellerOrgId: orgId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      story: true,
      _count: { select: { materials: true } },
    },
  });
  return rows.map((b) => ({
    id: b.id,
    name: b.name,
    logoUrl: b.logoUrl,
    story: b.story,
    materialCount: b._count.materials,
  }));
}

export async function saveBrand(
  ctx: SellerContext,
  brandId: string | null,
  input: BrandFormInput,
): Promise<{ ok: true; brandId: string } | { ok: false; error: "not_found" }> {
  const data = {
    name: input.name,
    logoUrl: input.logoUrl && input.logoUrl !== "" ? input.logoUrl : null,
    story: input.story && input.story !== "" ? input.story : null,
  };
  if (brandId) {
    const { count } = await prisma.brand.updateMany({
      where: { id: brandId, sellerOrgId: ctx.orgId },
      data,
    });
    if (count === 0) return { ok: false, error: "not_found" };
    return { ok: true, brandId };
  }
  const created = await prisma.brand.create({
    data: { ...data, sellerOrgId: ctx.orgId },
    select: { id: true },
  });
  return { ok: true, brandId: created.id };
}

/** Delete a brand; its materials keep existing with brandId cleared. */
export async function deleteBrand(ctx: SellerContext, brandId: string): Promise<boolean> {
  const found = await prisma.brand.findFirst({
    where: { id: brandId, sellerOrgId: ctx.orgId },
    select: { id: true },
  });
  if (!found) return false;
  await prisma.$transaction(async (tx) => {
    await tx.material.updateMany({ where: { brandId }, data: { brandId: null } });
    await tx.brand.delete({ where: { id: brandId } });
  });
  return true;
}
