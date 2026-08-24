/**
 * 신청자 관리 — 체육관 필터/그룹 + 대진 현황 필터 pure helpers.
 * gym display name SSOT는 호출 측에서 resolveApplicationGymDisplayName 결과를 넘긴다.
 */

export type ApplicantGymNameRow = {
  gymName: string;
};

export type ApplicantGymFilterOption = {
  name: string;
};

export type ApplicantAssignmentFilter = "all" | "assigned" | "unassigned";

export function normalizeApplicantGymDisplayName(
  name: string | null | undefined,
): string {
  const trimmed = (name ?? "").trim();
  return trimmed || "—";
}

/** 신청자 목록에 존재하는 체육관 display name → distinct + 가나다 정렬 */
export function buildApplicantGymFilterOptions(
  applications: ApplicantGymNameRow[],
): ApplicantGymFilterOption[] {
  const names = new Set<string>();
  for (const row of applications) {
    names.add(normalizeApplicantGymDisplayName(row.gymName));
  }
  return [...names]
    .sort((a, b) => a.localeCompare(b, "ko"))
    .map((name) => ({ name }));
}

/** 필터 적용 후 체육관 display name 기준 그룹 (0명 그룹은 호출 전 필터로 제거됨) */
export function groupApplicantsByGymDisplayName<T extends ApplicantGymNameRow>(
  applicants: T[],
): { gymName: string; rows: T[] }[] {
  const map = new Map<string, T[]>();
  for (const row of applicants) {
    const key = normalizeApplicantGymDisplayName(row.gymName);
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }
  return [...map.entries()]
    .map(([gymName, rows]) => ({ gymName, rows }))
    .sort((a, b) => a.gymName.localeCompare(b.gymName, "ko"));
}

/** event active Match 슬롯 → fighterId별 배정 수 (N+1 금지) */
export function buildApplicantAssignmentCountMap(
  matches: {
    fighterRedId: string | null;
    fighterBlueId: string | null;
  }[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const match of matches) {
    if (match.fighterRedId) {
      map.set(
        match.fighterRedId,
        (map.get(match.fighterRedId) ?? 0) + 1,
      );
    }
    if (match.fighterBlueId) {
      map.set(
        match.fighterBlueId,
        (map.get(match.fighterBlueId) ?? 0) + 1,
      );
    }
  }
  return map;
}

export function resolveApplicantAssignmentCount(
  assignmentCounts: Map<string, number>,
  fighterId: string | null | undefined,
): number {
  if (!fighterId) return 0;
  return assignmentCounts.get(fighterId) ?? 0;
}

export function matchesApplicantAssignmentFilter(
  assignmentCount: number,
  filter: ApplicantAssignmentFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "assigned") return assignmentCount >= 1;
  return assignmentCount === 0;
}
