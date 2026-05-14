import { NextResponse } from "next/server";
import { toApiError } from "@/lib/action-result";

export async function GET() {
  return NextResponse.json(
    toApiError("INTERNAL", "업로드 엔드포인트는 다음 단계에서 연결합니다."),
    { status: 501 },
  );
}
