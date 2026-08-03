import { NextResponse } from "next/server";
import {
  getMatchonAuthSmsE2eCode,
  isMatchonAuthSmsE2eInboxAllowed,
  loadMatchonPhoneVerificationConfig,
  isMatchonProductionRuntime,
} from "@/server/phone-verification";

export const dynamic = "force-dynamic";

/**
 * Development/E2E 전용. Production에서는 항상 404.
 * mock provider + E2E inbox flag 일 때만 동작.
 */
export async function GET(req: Request) {
  if (isMatchonProductionRuntime()) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
  const config = loadMatchonPhoneVerificationConfig();
  if (!isMatchonAuthSmsE2eInboxAllowed(config)) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
  const url = new URL(req.url);
  const requestId = url.searchParams.get("requestId")?.trim() || "";
  if (!requestId) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "requestId required" } },
      { status: 400 },
    );
  }
  const entry = getMatchonAuthSmsE2eCode(config, requestId);
  if (!entry) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "code not found" } },
      { status: 404 },
    );
  }
  return NextResponse.json({
    ok: true,
    data: {
      requestId: entry.requestId,
      purpose: entry.purpose,
      code: entry.code,
      createdAt: entry.createdAt,
    },
  });
}
