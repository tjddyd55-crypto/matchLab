import { NextResponse } from "next/server";
import { dashboardPathForRole } from "@/lib/auth/actor";
import {
  assertGoldenTestAuthSecret,
  isGoldenTestAuthEnabled,
  isGoldenTestAuthSecretConfigured,
  resolveGoldenTestOrganizerUserId,
  setGoldenTestSessionCookie,
} from "@/lib/auth/golden-test-auth";

export const dynamic = "force-dynamic";

const SECRET_HEADER = "x-matchon-golden-test-auth-secret";

/**
 * Golden Flow CI browser 전용 session bootstrap.
 * Production·flag 미설정·secret 불일치 시 404.
 * arbitrary user impersonation 불가 — golden-organizer만 허용.
 */
export async function POST(req: Request) {
  if (!isGoldenTestAuthEnabled() || !isGoldenTestAuthSecretConfigured()) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const secret = req.headers.get(SECRET_HEADER);
  if (!assertGoldenTestAuthSecret(secret)) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const userId = await resolveGoldenTestOrganizerUserId();
  if (!userId) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "golden organizer not seeded" } },
      { status: 404 },
    );
  }

  const ok = await setGoldenTestSessionCookie(userId);
  if (!ok) {
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "session bootstrap failed" } },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: { redirectTo: dashboardPathForRole("organizer") },
  });
}
