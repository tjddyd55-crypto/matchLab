import { NextResponse } from "next/server";
import { toApiError, toApiSuccess } from "@/lib/action-result";
import { requireActorFromMutation } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { AppError } from "@/lib/errors/app-error";
import { organizerPublicLogoService } from "@/lib/services/organizer-public-logo.service";

export const runtime = "nodejs";

function mapError(e: unknown) {
  if (e instanceof PermissionError) {
    return NextResponse.json(toApiError(e.reason, e.message), {
      status: e.reason === "UNAUTHORIZED" ? 401 : 403,
    });
  }
  if (e instanceof AppError) {
    const status =
      e.code === "FORBIDDEN" ? 403 : e.code === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json(toApiError(e.code, e.message), { status });
  }
  console.error("[organizer-public-logo]", e);
  return NextResponse.json(
    toApiError("INTERNAL", "로고 처리에 실패했습니다."),
    { status: 500 },
  );
}

export async function POST(request: Request) {
  try {
    const actor = await requireActorFromMutation();
    const body = (await request.json()) as {
      op?: string;
      mimeType?: string;
      logoPath?: string;
      logoUrl?: string;
      publicLogoVisible?: boolean;
      websiteUrl?: string | null;
    };

    if (body.op === "issue-upload") {
      if (!body.mimeType) {
        return NextResponse.json(
          toApiError("VALIDATION_ERROR", "mimeType이 필요합니다."),
          { status: 400 },
        );
      }
      const res = await organizerPublicLogoService.issueLogoUpload(
        actor,
        body.mimeType,
      );
      return NextResponse.json(toApiSuccess(res));
    }

    if (body.op === "save") {
      const res = await organizerPublicLogoService.update(actor, {
        logoPath: body.logoPath,
        logoUrl: body.logoUrl,
        publicLogoVisible: Boolean(body.publicLogoVisible),
        websiteUrl: body.websiteUrl ?? null,
      });
      return NextResponse.json(toApiSuccess(res));
    }

    return NextResponse.json(
      toApiError("VALIDATION_ERROR", "알 수 없는 요청입니다."),
      { status: 400 },
    );
  } catch (e) {
    return mapError(e);
  }
}
