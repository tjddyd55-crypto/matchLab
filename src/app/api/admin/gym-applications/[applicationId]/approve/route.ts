import { NextResponse } from "next/server";
import { toApiError, toApiSuccess } from "@/lib/action-result";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { AppError } from "@/lib/errors/app-error";
import { gymApplicationService } from "@/lib/services/gym-application.service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ applicationId: string }> },
) {
  try {
    const actor = await requireActorFromMutation();
    const { applicationId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      reviewMemo?: string;
    };
    const res = await gymApplicationService.approve(
      actor,
      applicationId,
      body.reviewMemo,
    );
    return NextResponse.json(
      toApiSuccess({
        gymId: res.gymId,
        loginReady: res.loginReady,
        inviteUrl: res.inviteUrl,
      }),
    );
  } catch (e) {
    if (e instanceof PermissionError) {
      return NextResponse.json(toApiError(e.reason, e.message), {
        status: e.reason === "UNAUTHORIZED" ? 401 : 403,
      });
    }
    if (e instanceof AppError) {
      const status =
        e.code === "FORBIDDEN"
          ? 403
          : e.code === "NOT_FOUND"
            ? 404
            : e.code === "CONFLICT"
              ? 409
              : 400;
      return NextResponse.json(toApiError(e.code, e.message), { status });
    }
    console.error("[gym-application-approve]", e);
    return NextResponse.json(
      toApiError("INTERNAL", "승인 처리에 실패했습니다."),
      { status: 500 },
    );
  }
}
