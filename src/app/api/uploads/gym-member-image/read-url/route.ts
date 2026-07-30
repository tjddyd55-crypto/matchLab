import { NextResponse } from "next/server";
import { toApiError, toApiSuccess } from "@/lib/action-result";
import { AppError } from "@/lib/errors/app-error";
import { PermissionError } from "@/lib/auth/permission-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 저장된 회원 사진의 단기 조회 URL (actor의 체육관 범위로만 서명). */
export async function POST(request: Request) {
  const { getCurrentActor } = await import("@/lib/auth/actor");
  const { createGymMemberImageSignedReadUrl } = await import(
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

    const body = (await request.json()) as { path?: string };
    if (!body.path) {
      return NextResponse.json(
        toApiError("VALIDATION_ERROR", "path가 필요합니다."),
        { status: 400 },
      );
    }

    const result = await createGymMemberImageSignedReadUrl(actor, body.path);
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
    console.error("[gym-member-image] issue read url failed");
    return NextResponse.json(
      toApiError("INTERNAL", "사진 조회 URL 발급에 실패했습니다."),
      { status: 500 },
    );
  }
}
