/**
 * 복수 출전 배정 signature / confirmation SSOT.
 * confirmed = 운영자가 현재 배정 집합을 의도된 복수 출전으로 승인함.
 */

export function buildMultiMatchAssignmentSignature(
  matchIds: readonly string[],
): string {
  return [...matchIds].filter(Boolean).sort().join("|");
}

export function isMultiMatchConfirmationValid(input: {
  currentMatchIds: readonly string[];
  confirmedSignature: string | null | undefined;
}): boolean {
  if (!input.confirmedSignature?.trim()) return false;
  if (input.currentMatchIds.length < 2) return false;
  return (
    buildMultiMatchAssignmentSignature(input.currentMatchIds) ===
    input.confirmedSignature.trim()
  );
}

export type BracketDuplicateMatchDetail = {
  matchId: string;
  matchLabel: string;
  corner: "홍" | "청";
  opponentName: string;
  divisionLabel: string;
  bracketId: string;
};

export type BracketDuplicateAssignmentIssue = {
  type: "DUPLICATE_ASSIGNMENT";
  fighterId: string;
  applicationId: string;
  fighterName: string;
  gymName: string;
  matchCount: number;
  matches: BracketDuplicateMatchDetail[];
  confirmed: boolean;
  confirmedAt: string | null;
};
