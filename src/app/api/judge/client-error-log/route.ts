import { NextResponse } from "next/server";
import {
  JUDGE_CLIENT_ERROR_LOG_PREFIX,
  JUDGE_CLIENT_ERROR_MAX_BODY_BYTES,
  sanitizeJudgeClientErrorPayload,
} from "@/lib/judge-client-error-log";

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > JUDGE_CLIENT_ERROR_MAX_BODY_BYTES) {
      return new NextResponse(null, { status: 204 });
    }

    const body = raw ? (JSON.parse(raw) as unknown) : null;
    const safe = sanitizeJudgeClientErrorPayload(body);
    if (safe) {
      console.error(JUDGE_CLIENT_ERROR_LOG_PREFIX, safe);
    }
  } catch {
    // 로깅 실패는 사용자 흐름에 영향을 주지 않는다.
  }

  return new NextResponse(null, { status: 204 });
}
