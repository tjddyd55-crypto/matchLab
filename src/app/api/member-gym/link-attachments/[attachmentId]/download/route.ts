import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { memberGymUploadService } from "@/lib/services/member-gym-upload.service";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ attachmentId: string }> },
) {
  try {
    const { attachmentId } = await context.params;
    const token = new URL(request.url).searchParams.get("token");
    if (!token) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "토큰이 필요합니다." } },
        { status: 401 },
      );
    }
    const { signedUrl } =
      await memberGymUploadService.getLinkAttachmentDownloadByToken(
        token,
        attachmentId,
      );
    return NextResponse.redirect(signedUrl);
  } catch (e) {
    if (e instanceof AppError) {
      const status =
        e.code === "FORBIDDEN" ? 403 : e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json(
        { error: { code: e.code, message: e.message } },
        { status },
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "다운로드에 실패했습니다." } },
      { status: 500 },
    );
  }
}
