export type CourtAssignmentRule = {
  courtId: string;
  divisionId: string | null;
  weightClassLabel: string | null;
  priority: number;
  isActive: boolean;
};

export type CourtAssignmentDivision = {
  id: string;
  weightClass: string | null;
};

function normalizeWeight(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * 자동 경기장 배정 — 수동 courtId가 있으면 호출하지 않음.
 * 우선순위: 경기구분+체급 > 체급 단독 > 경기구분 전체 > priority 오름차순
 */
export function resolveCourtIdFromRules(
  rules: CourtAssignmentRule[],
  division: CourtAssignmentDivision,
): string | null {
  const active = rules
    .filter((r) => r.isActive)
    .sort((a, b) => a.priority - b.priority);

  const weight = normalizeWeight(division.weightClass);

  if (weight) {
    const divisionAndWeight = active.find(
      (r) =>
        r.divisionId === division.id &&
        normalizeWeight(r.weightClassLabel) === weight,
    );
    if (divisionAndWeight) return divisionAndWeight.courtId;

    const weightOnly = active.find(
      (r) => !r.divisionId && normalizeWeight(r.weightClassLabel) === weight,
    );
    if (weightOnly) return weightOnly.courtId;
  }

  const divisionWhole = active.find(
    (r) =>
      r.divisionId === division.id && !normalizeWeight(r.weightClassLabel),
  );
  if (divisionWhole) return divisionWhole.courtId;

  return null;
}

export function formatCourtRuleLabel(input: {
  divisionLabel: string | null;
  weightClassLabel: string | null;
}): string {
  const weight = normalizeWeight(input.weightClassLabel);
  if (input.divisionLabel && weight) {
    return `${input.divisionLabel} · ${weight}`;
  }
  if (input.divisionLabel) return input.divisionLabel;
  if (weight) return `체급 ${weight}`;
  return "배정 규칙";
}
