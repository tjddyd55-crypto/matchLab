"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { getCurrentActor, requireActor } from "@/lib/auth/actor";
import { prisma } from "@/lib/prisma";
import {
  isDesktopSupportInquiryCategory,
  isDesktopSupportInquiryStatus,
} from "@/lib/desktop/support-inquiry";
import { checkDesktopSupportInquiryRateLimit } from "@/lib/desktop/support-inquiry-rate-limit";
import { AppError } from "@/lib/errors/app-error";
import { desktopSupportInquiryService } from "@/lib/services/desktop-support-inquiry.service";

function formReq(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function mapCaught<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  return fn().catch((e: unknown) => {
    if (e instanceof AppError) {
      return actionFailure(e.code, e.message, e.details);
    }
    console.error(
      "[desktop-support-inquiry]",
      e instanceof Error ? e.message : "error",
    );
    return actionFailure("INTERNAL", "처리 중 오류가 발생했습니다.");
  });
}

async function clientIpHashSeed(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

/** 로그인 전 공개 생성 — 인증 불필요. source/status는 서버 고정. */
export async function createDesktopSupportInquiryAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return mapCaught(async () => {
    const categoryRaw = formReq(formData, "category");
    if (!isDesktopSupportInquiryCategory(categoryRaw)) {
      return actionFailure("VALIDATION_ERROR", "문의 유형이 올바르지 않습니다.");
    }

    const contact = formReq(formData, "contact");
    const message = formReq(formData, "message");
    const rate = checkDesktopSupportInquiryRateLimit({
      ip: await clientIpHashSeed(),
      contactNormalized: contact.toLowerCase(),
      category: categoryRaw,
      messageNormalized: message.toLowerCase(),
    });
    if (!rate.ok) {
      return actionFailure(
        "FORBIDDEN",
        "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
        { retryAfterSec: rate.retryAfterSec },
      );
    }

    let loginId = formReq(formData, "loginId") || null;
    const actor = await getCurrentActor();
    if (actor) {
      const sessionUser = await prisma.user.findFirst({
        where: { id: actor.userId },
        select: { loginId: true },
      });
      if (sessionUser?.loginId) {
        loginId = sessionUser.loginId;
      }
    }

    const created = await desktopSupportInquiryService.createPublic({
      category: categoryRaw,
      name: formReq(formData, "name"),
      loginId,
      contact,
      message,
      appVersion: formReq(formData, "appVersion") || null,
      roleHint: formReq(formData, "roleHint") || null,
    });

    return actionSuccess(created);
  });
}

export async function updateDesktopSupportInquiryStatusAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return mapCaught(async () => {
    const actor = await requireActor();
    if (actor.role !== "admin") {
      return actionFailure("FORBIDDEN", "관리자만 접근할 수 있습니다.");
    }

    const id = formReq(formData, "id");
    const statusRaw = formReq(formData, "status");
    if (!id) {
      return actionFailure("VALIDATION_ERROR", "문의 ID가 필요합니다.");
    }
    if (!isDesktopSupportInquiryStatus(statusRaw)) {
      return actionFailure("VALIDATION_ERROR", "상태가 올바르지 않습니다.");
    }

    const updated = await desktopSupportInquiryService.updateStatus(actor, {
      id,
      status: statusRaw,
      adminNote: formReq(formData, "adminNote") || null,
    });

    revalidatePath("/admin/support-inquiries");
    revalidatePath(`/admin/support-inquiries/${id}`);
    return actionSuccess({ id: updated.id });
  });
}
