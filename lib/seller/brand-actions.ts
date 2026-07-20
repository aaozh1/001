"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { canManageMaterials, getSellerContext } from "@/lib/seller/context";
import { brandFormSchema, deleteBrand, saveBrand } from "./brand-service";

export type BrandActionResult = { ok: boolean; error?: string; brandId?: string };

async function brandManagerContext() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const ctx = await getSellerContext(session.user.id);
  if (!ctx || !canManageMaterials(ctx.role)) return null;
  return ctx;
}

export async function saveBrandAction(
  brandId: string | null,
  raw: unknown,
): Promise<BrandActionResult> {
  const ctx = await brandManagerContext();
  if (!ctx) return { ok: false, error: "forbidden" };

  const parsed = brandFormSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const result = await saveBrand(ctx, brandId, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/seller/brands");
  revalidatePath("/seller/materials");
  return { ok: true, brandId: result.brandId };
}

export async function deleteBrandAction(brandId: string): Promise<BrandActionResult> {
  const ctx = await brandManagerContext();
  if (!ctx) return { ok: false, error: "forbidden" };

  const deleted = await deleteBrand(ctx, brandId);
  if (!deleted) return { ok: false, error: "not_found" };

  revalidatePath("/seller/brands");
  revalidatePath("/seller/materials");
  return { ok: true };
}
