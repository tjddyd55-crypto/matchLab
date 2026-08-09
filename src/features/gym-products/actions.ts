"use server";

import { revalidatePath } from "next/cache";
import {
  actionFailure,
  actionSuccess,
  permissionReasonToActionCode,
  type ActionResult,
} from "@/lib/action-result";
import { PermissionError } from "@/lib/auth/permission-error";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { gymProductService } from "@/lib/services/gym-product.service";
import {
  gymProductCreateSchema,
  gymProductUpdateSchema,
} from "@/lib/validators/gym-product.validator";

function mapCaught<T>(
  fn: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  return fn().catch((e: unknown) => {
    if (e instanceof AppError) {
      return actionFailure(e.code, e.message, e.details);
    }
    if (e instanceof PermissionError) {
      return actionFailure(permissionReasonToActionCode(e.reason), e.message);
    }
    console.error(e);
    return actionFailure("INTERNAL", "처리 중 오류가 발생했습니다.");
  });
}

function formStr(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function revalidateProductPaths() {
  revalidatePath("/gym/products");
  revalidatePath("/gym/sales");
  revalidatePath("/gym/sales/receivables");
}

export async function createGymProductAction(
  formData: FormData,
): Promise<ActionResult<{ productId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymProductCreateSchema.safeParse({
      name: formStr(formData, "name"),
      category: formStr(formData, "category") || undefined,
      defaultPrice: formStr(formData, "defaultPrice"),
      memo: formStr(formData, "memo"),
      isActive: formData.get("isActive") === "true",
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    const created = await gymProductService.createProduct(actor, parsed.data);
    revalidateProductPaths();
    return actionSuccess({ productId: created.id });
  });
}

export async function updateGymProductAction(
  productId: string,
  formData: FormData,
): Promise<ActionResult<{ productId: string }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    const parsed = gymProductUpdateSchema.safeParse({
      name: formStr(formData, "name"),
      category: formStr(formData, "category") || undefined,
      defaultPrice: formStr(formData, "defaultPrice"),
      memo: formStr(formData, "memo"),
      isActive: formData.get("isActive") === "true",
    });
    if (!parsed.success) {
      return actionFailure(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
      );
    }
    const updated = await gymProductService.updateProduct(
      actor,
      productId,
      parsed.data,
    );
    revalidateProductPaths();
    return actionSuccess({ productId: updated.id });
  });
}

export async function deleteGymProductAction(
  productId: string,
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    await gymProductService.softDeleteProduct(actor, productId);
    revalidateProductPaths();
    return actionSuccess({ ok: true });
  });
}

export async function reorderGymProductsAction(
  orderedIds: string[],
): Promise<ActionResult<{ ok: true }>> {
  return mapCaught(async () => {
    const actor = await requireActorFromMutation();
    await gymProductService.reorderProducts(actor, orderedIds);
    revalidateProductPaths();
    return actionSuccess({ ok: true });
  });
}
