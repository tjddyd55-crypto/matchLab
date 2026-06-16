"use client";

import { formatBirthDateInput, parseBirthDateInput } from "@/lib/judge-identity";

export type CourtJudgeRole = "score" | "head";

export type CourtJudgeSession = {
  judgeName: string;
  birthDate: string;
};

function storageKey(courtId: string, role: CourtJudgeRole): string {
  return `court-judge-session:${courtId}:${role}`;
}

export function readCourtJudgeSession(
  courtId: string,
  role: CourtJudgeRole,
): CourtJudgeSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(courtId, role));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CourtJudgeSession;
    const judgeName = parsed.judgeName?.trim();
    const birthDate = parsed.birthDate?.trim();
    if (!judgeName || !birthDate || !parseBirthDateInput(birthDate)) return null;
    return { judgeName, birthDate };
  } catch {
    return null;
  }
}

export function writeCourtJudgeSession(
  courtId: string,
  role: CourtJudgeRole,
  input: { judgeName: string; birthDate: string },
): CourtJudgeSession | null {
  const judgeName = input.judgeName.trim();
  const birth = parseBirthDateInput(input.birthDate);
  if (!judgeName || !birth) return null;
  const session = {
    judgeName,
    birthDate: formatBirthDateInput(birth),
  };
  window.localStorage.setItem(storageKey(courtId, role), JSON.stringify(session));
  return session;
}

export function clearCourtJudgeSession(
  courtId: string,
  role: CourtJudgeRole,
): void {
  window.localStorage.removeItem(storageKey(courtId, role));
}
