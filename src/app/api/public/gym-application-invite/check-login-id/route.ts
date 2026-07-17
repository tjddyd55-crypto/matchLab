import { NextResponse } from "next/server";
import { toApiError, toApiSuccess } from "@/lib/action-result";
import { AppError } from "@/lib/errors/app-error";
import { gymApplicationService } from "@/lib/services/gym-application.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { loginId?: string };
    if (!body.loginId?.trim()) {
      return NextResponse.json(
        toApiError("VALIDATION_ERROR", "아이디를 입력해 주세요."),
        { status: 400 },
      );
    }
    const res = await gymApplicationService.isLoginIdAvailableForInvite(
      body.loginId,
    );
    return NextResponse.json(toApiSuccess(res));
  } catch (e) {
    if (e instanceof AppError) {
      return NextResponse.json(toApiError(e.code, e.message), { status: 400 });
    }
    console.error("[gym-application-check-login-id]", e);
    return NextResponse.json(
      toApiError("INTERNAL", "중복 확인에 실패했습니다."),
      { status: 500 },
    );
  }
}
