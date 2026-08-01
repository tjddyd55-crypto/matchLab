import { NextResponse } from "next/server";
import { getDesktopWebVersionPayload } from "@/lib/desktop/web-version";

export const dynamic = "force-dynamic";

/**
 * MATCHON Manager 웹 배포 버전 조회.
 * - secret / Railway 내부 host / 전체 env 비노출
 * - Electron이 stale cache 없이 조회하도록 no-store
 */
export async function GET() {
  const payload = getDesktopWebVersionPayload();
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
