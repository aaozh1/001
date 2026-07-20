"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { canManageMaterials, getSellerContext } from "@/lib/seller/context";
import { materialFormSchema, materialStatusSchema } from "./seller-schemas";
import { saveMaterial, setMaterialStatus } from "./seller-service";

export type SellerMaterialActionResult =
  | { ok: true; materialId?: string; completeness?: number }
  | { ok: false; error: string };

async function materialManagerContext() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const ctx = await getSellerContext(session.user.id);
  if (!ctx || !canManageMaterials(ctx.role)) return null;
  return ctx;
}

export async function saveMaterialAction(
  materialId: string | null,
  raw: unknown,
): Promise<SellerMaterialActionResult> {
  const ctx = await materialManagerContext();
  if (!ctx) return { ok: false, error: "forbidden" };

  const parsed = materialFormSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const result = await saveMaterial(ctx, materialId, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/seller/materials");
  return { ok: true, materialId: result.materialId, completeness: result.completeness };
}

export async function setMaterialStatusAction(
  materialId: string,
  rawStatus: unknown,
): Promise<SellerMaterialActionResult> {
  const ctx = await materialManagerContext();
  if (!ctx) return { ok: false, error: "forbidden" };

  const parsed = materialStatusSchema.safeParse(rawStatus);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const result = await setMaterialStatus(ctx, materialId, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/seller/materials");
  return { ok: true };
}
