import { NextResponse } from "next/server";
import { AssociationMemberGymApplicationAttachmentType } from "@/lib/enums";
import { toApiError, toApiSuccess } from "@/lib/action-result";
import { AppError } from "@/lib/errors/app-error";
import { memberGymUploadService } from "@/lib/services/member-gym-upload.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: string;
      uploadBatchId?: string;
      attachmentType?: string;
      mimeType?: string;
      sizeBytes?: number;
      originalFileName?: string;
    };
    if (
      !body.token ||
      !body.uploadBatchId ||
      !body.attachmentType ||
      !body.mimeType ||
      !body.sizeBytes ||
      !body.originalFileName
    ) {
      return NextResponse.json(
        toApiError("VALIDATION_ERROR", "업로드 요청이 올바르지 않습니다."),
        { status: 400 },
      );
    }
    if (
      !Object.values(AssociationMemberGymApplicationAttachmentType).includes(
        body.attachmentType as AssociationMemberGymApplicationAttachmentType,
      )
    ) {
      return NextResponse.json(
        toApiError("VALIDATION_ERROR", "첨부 유형이 올바르지 않습니다."),
        { status: 400 },
      );
    }
    const result = await memberGymUploadService.issueApplicationUploadUrl({
      token: body.token,
      uploadBatchId: body.uploadBatchId,
      attachmentType:
        body.attachmentType as AssociationMemberGymApplicationAttachmentType,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      originalFileName: body.originalFileName,
    });
    return NextResponse.json(toApiSuccess(result));
  } catch (e) {
    if (e instanceof AppError) {
      const status =
        e.code === "FORBIDDEN" ? 403 : e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json(toApiError(e.code === "VALIDATION_ERROR" ? "VALIDATION_ERROR" : e.code === "FORBIDDEN" ? "FORBIDDEN" : "INTERNAL", e.message), {
        status,
      });
    }
    console.error("[member-gym-upload]", e);
    return NextResponse.json(
      toApiError("INTERNAL", "업로드 URL 발급에 실패했습니다."),
      { status: 500 },
    );
  }
}
