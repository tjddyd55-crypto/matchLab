/**
 * 보호자 동의 필요 여부 (등록 제출·체육관 승인 게이트 단일 정책).
 *
 * 대한민국 민법상 성년은 만 19세이나, 대회·단체 정책은 향후 변경 가능하므로
 * 나이 임계값만 별도 조정하면 되도록 여기에 모은다.
 */

/** MVP: 출생일 기준 완료 나이가 이 값 미만이면 미성년으로 동의 필요. */
const MVP_MINOR_MAX_COMPLETED_AGE = 18;

function completedAgeUtc(birthUtc: Date, referenceUtc: Date): number {
  let age = referenceUtc.getUTCFullYear() - birthUtc.getUTCFullYear();
  const m = referenceUtc.getUTCMonth() - birthUtc.getUTCMonth();
  const d = referenceUtc.getUTCDate() - birthUtc.getUTCDate();
  if (m < 0 || (m === 0 && d < 0)) age -= 1;
  return age;
}

export type GuardianConsentPolicyInput = {
  birthDate: Date;
  schoolName: string | null;
  grade: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
};

export function requiresGuardianConsent(
  row: GuardianConsentPolicyInput,
  referenceDate: Date = new Date(),
): boolean {
  // TODO: 대회·체육관 정책별 성년/동의 기준을 설정으로 빼고 주입 가능하게 할 것.

  const hasSchoolOrGrade = Boolean(
    row.schoolName?.trim() || row.grade?.trim(),
  );
  if (hasSchoolOrGrade) return true;

  const hasGuardianContact = Boolean(
    row.guardianName?.trim() || row.guardianPhone?.trim(),
  );
  if (hasGuardianContact) return true;

  const age = completedAgeUtc(row.birthDate, referenceDate);
  if (age <= MVP_MINOR_MAX_COMPLETED_AGE) return true;

  return false;
}

/** `Fighter` 등 등록 시 보존된 필드로 동의 필요 여부 판단 (단일 정책 재사용). */
export type FighterConsentPolicyFields = GuardianConsentPolicyInput;

export function requiresGuardianConsentFromFighterProfile(
  row: FighterConsentPolicyFields,
  referenceDate?: Date,
): boolean {
  return requiresGuardianConsent(row, referenceDate);
}
