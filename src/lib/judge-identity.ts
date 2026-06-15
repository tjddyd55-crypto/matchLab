import type { JudgeCredentialRole } from "@/generated/prisma";

/** YYYY-MM-DD */
export function formatBirthDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseBirthDateInput(value: string): Date | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const d = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/** 공개/집계 화면용 — 1990-05-15 → 1990-**-** */
export function maskBirthDate(isoDate: string | null | undefined): string | null {
  if (!isoDate?.trim()) return null;
  const m = /^(\d{4})-\d{2}-\d{2}$/.exec(isoDate.trim());
  if (!m) return null;
  return `${m[1]}-**-**`;
}

export const JUDGE_ROLE_LABELS: Record<JudgeCredentialRole, string> = {
  SCORING_JUDGE: "채점심판",
  HEAD_JUDGE: "주심/결과확인",
  ANNOUNCER: "결과발표",
};

/** 주최측 계정 생성 UI — 기본 노출 역할 */
export const ORGANIZER_JUDGE_ROLE_OPTIONS: {
  value: JudgeCredentialRole;
  label: string;
  description: string;
}[] = [
  {
    value: "SCORING_JUDGE",
    label: "채점심판",
    description: "배정 경기 채점 · 본인 점수만 입력",
  },
  {
    value: "ANNOUNCER",
    label: "결과발표",
    description: "채점 결과 확인 · 발표용 read-only",
  },
  {
    value: "HEAD_JUDGE",
    label: "주심/결과확인",
    description: "집계 확인 · 내부 운영용",
  },
];

export function judgeDefaultRoute(role: JudgeCredentialRole): string {
  switch (role) {
    case "HEAD_JUDGE":
      return "/judge/review";
    case "ANNOUNCER":
      return "/judge/results";
    default:
      return "/judge/matches";
  }
}

export function judgeRoleCanScore(role: JudgeCredentialRole): boolean {
  return role === "SCORING_JUDGE";
}
