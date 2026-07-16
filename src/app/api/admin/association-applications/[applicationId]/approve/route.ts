import { NextResponse } from "next/server";
import { toApiError, toApiSuccess } from "@/lib/action-result";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { AppError } from "@/lib/errors/app-error";
import { associationApplicationService } from "@/lib/services/association-application.service";

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
    const res = await associationApplicationService.approve(
      actor,
      applicationId,
      body.reviewMemo,
    );
    return NextResponse.json(
      toApiSuccess({
        inviteUrl: res.inviteUrl,
        organizerId: res.organizerId,
      }),
    );
  } catch (e) {
    if (e instanceof PermissionError) {
      return NextResponse.json(toApiError(e.code, e.message), {
        status: e.code === "UNAUTHORIZED" ? 401 : 403,
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
    console.error("[association-approve]", e);
    return NextResponse.json(
      toApiError("INTERNAL", "승인 처리에 실패했습니다."),
      { status: 500 },
    );
  }
}
