import "server-only";

import { cookies } from "next/headers";
import { COURT_JUDGE_ENTRY_COOKIE } from "@/lib/constants/court-judge-entry";
import {
  createJudgeSessionToken,
  parseJudgeSessionToken,
} from "@/lib/judge-session";
import type { CourtJudgeEntryTarget } from "@/lib/judge-qr-entry-token";

export type CourtJudgeEntrySession = {
  eventId: string;
  courtId: string;
  target: CourtJudgeEntryTarget;
  exp: number;
};

function decodeSessionToken(token: string): CourtJudgeEntrySession | null {
  const parsed = parseJudgeSessionToken(token);
  if (!parsed) return null;

  const [courtId, targetRaw] = parsed.credentialId.split(":");
  if (!courtId || (targetRaw !== "score" && targetRaw !== "head")) {
    return null;
  }

  return {
    eventId: parsed.eventId,
    courtId,
    target: targetRaw,
    exp: parsed.exp,
  };
}

export async function setCourtJudgeEntryCookie(
  input: Omit<CourtJudgeEntrySession, "exp">,
  ttlMs = 1000 * 60 * 60 * 12,
): Promise<void> {
  const token = createJudgeSessionToken(
    {
      credentialId: `${input.courtId}:${input.target}`,
      eventId: input.eventId,
    },
    ttlMs,
  );
  const cookieStore = await cookies();
  cookieStore.set(COURT_JUDGE_ENTRY_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(ttlMs / 1000),
  });
}

export async function readCourtJudgeEntrySession(): Promise<CourtJudgeEntrySession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COURT_JUDGE_ENTRY_COOKIE)?.value;
  if (!token) return null;
  return decodeSessionToken(token);
}

export async function assertCourtJudgeEntryAccess(
  courtId: string,
  target: CourtJudgeEntryTarget,
): Promise<{ ok: true; eventId: string } | { ok: false }> {
  const session = await readCourtJudgeEntrySession();
  if (!session) return { ok: false };
  if (session.courtId !== courtId || session.target !== target) {
    return { ok: false };
  }
  return { ok: true, eventId: session.eventId };
}
