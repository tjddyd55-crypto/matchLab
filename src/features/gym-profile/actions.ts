"use server";

import { revalidatePath } from "next/cache";
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { PermissionError } from "@/lib/auth/permission-error";
import { requireGymPortalRead } from "@/lib/gym-portal-access";
import { prisma } from "@/lib/prisma";

function mapError(e: unknown): ActionResult<never> {
  if (e instanceof PermissionError) {
    return actionFailure("FORBIDDEN", e.message || "권한이 없습니다.");
  }
  if (e instanceof AppError) {
    return actionFailure("VALIDATION_ERROR", e.message);
  }
  console.error("[gym-profile]", e);
  return actionFailure("INTERNAL", "저장에 실패했습니다.");
}

/** 연락처·주소만 수정. 회원사 suspended여도 조회 가능하면 허용(선수 write와 분리). */
export async function updateGymProfileAction(input: {
  phone?: string;
  address?: string;
}): Promise<ActionResult<{ ok: true }>> {
  try {
    const actor = await requireActorFromMutation();
    const access = await requireGymPortalRead(actor);
    await prisma.gym.update({
      where: { id: access.gymId },
      data: {
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
      },
    });
    revalidatePath("/gym/profile");
    revalidatePath("/gym");
    return actionSuccess({ ok: true });
  } catch (e) {
    return mapError(e);
  }
}
