import { NextResponse } from "next/server";
import { toApiError, toApiSuccess } from "@/lib/action-result";
import { PROFILE_IMAGE_MAX_BYTES } from "@/lib/constants/profile-image-upload";
import { AppError } from "@/lib/errors/app-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { getCurrentActor } = await import("@/lib/auth/actor");
  const { createFighterProfileImageUploadUrl } = await import(
    "@/lib/services/upload.service"
  );
  try {
    const actor = await getCurrentActor();
    if (!actor) {
      return NextResponse.json(toApiError("UNAUTHORIZED", "로그인이 필요합니다."), {
        status: 401,
      });
    }
    const body = (await request.json()) as {
      fighterId?: string;
      mimeType?: string;
    };
    if (!body.fighterId || !body.mimeType) {
      return NextResponse.json(
        toApiError("VALIDATION_ERROR", "fighterId와 mimeType이 필요합니다."),
        { status: 400 },
      );
    }
    const result = await createFighterProfileImageUploadUrl(actor, {
      fighterId: body.fighterId,
      mimeType: body.mimeType,
    });
    return NextResponse.json(
      toApiSuccess({
        ...result,
        maxBytes: PROFILE_IMAGE_MAX_BYTES,
      }),
    );
  } catch (e) {
    if (e instanceof AppError) {
      return NextResponse.json(toApiError(e.code, e.message), {
        status: e.code === "FORBIDDEN" ? 403 : 400,
      });
    }
    console.error(e);
    return NextResponse.json(
      toApiError("INTERNAL", "업로드 URL 발급에 실패했습니다."),
      { status: 500 },
    );
  }
}
