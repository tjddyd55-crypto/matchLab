import { NextResponse } from "next/server";
import { toApiError, toApiSuccess } from "@/lib/action-result";
import { AppError } from "@/lib/errors/app-error";
import { PermissionError } from "@/lib/auth/permission-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 회원 프로필 사진 업로드 signed URL 발급.
 * private 버킷이므로 공개 URL은 반환하지 않고 path만 내려준다.
 * 저장 후 조회 URL은 `/api/uploads/gym-member-image/read-url` 또는 서버 렌더에서 발급한다.
 */
export async function POST(request: Request) {
  const { getCurrentActor } = await import("@/lib/auth/actor");
  const { createGymMemberImageUploadUrl } = await import(
    "@/lib/services/gym-member-image.service"
  );
  try {
    const actor = await getCurrentActor();
    if (!actor) {
      return NextResponse.json(
        toApiError("UNAUTHORIZED", "로그인이 필요합니다."),
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      memberId?: string | null;
      mimeType?: string;
    };
    if (!body.mimeType) {
      return NextResponse.json(
        toApiError("VALIDATION_ERROR", "mimeType이 필요합니다."),
        { status: 400 },
      );
    }

    const result = await createGymMemberImageUploadUrl(actor, {
      memberId: body.memberId ?? null,
      mimeType: body.mimeType,
    });
    return NextResponse.json(toApiSuccess(result));
  } catch (e) {
    if (e instanceof PermissionError) {
      return NextResponse.json(
        toApiError("FORBIDDEN", e.message || "권한이 없습니다."),
        { status: 403 },
      );
    }
    if (e instanceof AppError) {
      return NextResponse.json(toApiError(e.code, e.message), {
        status: e.code === "FORBIDDEN" ? 403 : 400,
      });
    }
    console.error("[gym-member-image] issue upload url failed");
    return NextResponse.json(
      toApiError("INTERNAL", "업로드 URL 발급에 실패했습니다."),
      { status: 500 },
    );
  }
}
