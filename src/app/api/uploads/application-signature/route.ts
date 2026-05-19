import { NextResponse } from "next/server";
import { z } from "zod";
import { toApiError, toApiSuccess } from "@/lib/action-result";
import { AppError } from "@/lib/errors/app-error";
import {
  CONSENT_SIGNATURE_MAX_BYTES,
  createApplicationAthleteSignatureUploadUrl,
} from "@/lib/services/upload.service";

export const runtime = "nodejs";

const bodySchema = z.object({
  token: z.string().min(1),
  documentId: z.string().min(1),
  consentId: z.string().min(1),
  mimeType: z.enum(["image/png", "image/webp"]),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      toApiError("VALIDATION_ERROR", "JSON 본문이 필요합니다."),
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      toApiError("VALIDATION_ERROR", "입력값을 확인해 주세요.", parsed.error.flatten()),
      { status: 400 },
    );
  }

  try {
    const result = await createApplicationAthleteSignatureUploadUrl(parsed.data);
    return NextResponse.json(
      toApiSuccess({
        uploadUrl: result.uploadUrl,
        path: result.path,
        expiresIn: result.expiresIn,
        maxBytes: CONSENT_SIGNATURE_MAX_BYTES,
      }),
    );
  } catch (e: unknown) {
    if (e instanceof AppError) {
      const status =
        e.code === "NOT_FOUND"
          ? 404
          : e.code === "FORBIDDEN"
            ? 403
            : e.code === "VALIDATION_ERROR"
              ? 400
              : 500;
      return NextResponse.json(toApiError(e.code, e.message, e.details), {
        status,
      });
    }
    console.error(e);
    return NextResponse.json(
      toApiError("INTERNAL", "업로드 URL 발급 중 오류가 발생했습니다."),
      { status: 500 },
    );
  }
}
