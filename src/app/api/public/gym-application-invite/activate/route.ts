import { NextResponse } from "next/server";
import { toApiError, toApiSuccess } from "@/lib/action-result";
import { AppError } from "@/lib/errors/app-error";
import { gymApplicationService } from "@/lib/services/gym-application.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: string;
      loginId?: string;
      password?: string;
      passwordConfirm?: string;
    };
    if (
      !body.token?.trim() ||
      !body.loginId?.trim() ||
      !body.password ||
      !body.passwordConfirm
    ) {
      return NextResponse.json(
        toApiError("VALIDATION_ERROR", "입력값을 확인해 주세요."),
        { status: 400 },
      );
    }
    const res = await gymApplicationService.acceptOwnerInvite(body.token, {
      loginId: body.loginId,
      password: body.password,
      passwordConfirm: body.passwordConfirm,
    });
    return NextResponse.json(toApiSuccess(res));
  } catch (e) {
    if (e instanceof AppError) {
      const status =
        e.code === "FORBIDDEN" ? 403 : e.code === "CONFLICT" ? 409 : 400;
      return NextResponse.json(toApiError(e.code, e.message), { status });
    }
    console.error("[gym-application-activate]", e);
    return NextResponse.json(
      toApiError("INTERNAL", "계정 활성화에 실패했습니다."),
      { status: 500 },
    );
  }
}
