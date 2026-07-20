"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { canManageMaterials, getSellerContext } from "@/lib/seller/context";
import { materialFormSchema, materialStatusSchema } from "./seller-schemas";
import {
  addMaterialImage,
  removeMaterialImage,
  saveMaterial,
  setMaterialStatus,
} from "./seller-service";
import { IMAGE_MAX_BYTES } from "@/lib/files/storage";

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

export type ImageActionResult =
  | { ok: true; images: string[] }
  | { ok: false; error: string };

/** Upload one product photo (multipart form field `file`). */
export async function uploadMaterialImageAction(
  materialId: string,
  form: FormData,
): Promise<ImageActionResult> {
  const ctx = await materialManagerContext();
  if (!ctx) return { ok: false, error: "forbidden" };

  const file = form.get("file");
  if (!(file instanceof File)) return { ok: false, error: "invalid" };
  if (file.size > IMAGE_MAX_BYTES) return { ok: false, error: "too_large" };

  const result = await addMaterialImage(ctx, materialId, Buffer.from(await file.arrayBuffer()));
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/seller/materials");
  return { ok: true, images: result.images };
}

export async function removeMaterialImageAction(
  materialId: string,
  url: string,
): Promise<ImageActionResult> {
  const ctx = await materialManagerContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  const result = await removeMaterialImage(ctx, materialId, url);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/seller/materials");
  return { ok: true, images: result.images };
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
