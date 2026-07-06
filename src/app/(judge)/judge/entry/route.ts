import { NextRequest, NextResponse } from "next/server";
import { setCourtJudgeEntryCookie } from "@/lib/court-judge-entry-session";
import { getServerAppBaseUrl } from "@/lib/qr-url";
import { validateCourtJudgeEntry } from "@/lib/services/judge-qr-entry.service";

export const dynamic = "force-dynamic";

function toAbsoluteRedirectUrl(request: NextRequest, path: string): URL {
  const base = getServerAppBaseUrl(request.headers);
  return new URL(path.startsWith("/") ? path : `/${path}`, base);
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const target = sp.get("target")?.trim() ?? "";

  if (target === "login") {
    const params = new URLSearchParams();
    const eventId = sp.get("eventId")?.trim();
    if (eventId) params.set("eventId", eventId);
    const loginId = sp.get("loginId")?.trim();
    if (loginId) params.set("loginId", loginId);
    const loginPath = `/judge/login${params.size > 0 ? `?${params.toString()}` : ""}`;
    return NextResponse.redirect(toAbsoluteRedirectUrl(request, loginPath));
  }

  const result = await validateCourtJudgeEntry({
    eventId: sp.get("eventId"),
    courtId: sp.get("courtId"),
    token: sp.get("token"),
    target: sp.get("target"),
  });

  if (!result.ok) {
    const errorUrl = toAbsoluteRedirectUrl(request, "/judge/entry/error");
    errorUrl.searchParams.set("reason", result.reason);
    return NextResponse.redirect(errorUrl);
  }

  await setCourtJudgeEntryCookie({
    eventId: result.eventId,
    courtId: result.courtId,
    target: result.target,
  });

  return NextResponse.redirect(toAbsoluteRedirectUrl(request, result.redirectTo));
}
