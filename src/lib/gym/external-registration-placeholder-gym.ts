import type { Prisma } from "@/generated/prisma";

/** 외부 공개등록 FK용 공용 Gym — 신규 생성 금지. 레거시 row만 존재할 수 있음. */
export const EXTERNAL_REGISTRATION_GYM_LOGIN_PREFIX = "ext-reg-";
export const EXTERNAL_REGISTRATION_GYM_NAME_PREFIX = "MATCHON 외부등록";

export function isExternalRegistrationPlaceholderOwnerLoginId(
  loginId: string | null | undefined,
): boolean {
  return Boolean(loginId?.startsWith(EXTERNAL_REGISTRATION_GYM_LOGIN_PREFIX));
}

export function isExternalRegistrationPlaceholderGymName(
  name: string | null | undefined,
): boolean {
  const n = name?.trim() ?? "";
  return n.startsWith(EXTERNAL_REGISTRATION_GYM_NAME_PREFIX);
}

/** Prisma where — 활성 목록/피커/검색/Admin 전체 체육관에서 placeholder Gym 제외 */
export const excludeExternalRegistrationPlaceholderGymWhere: Prisma.GymWhereInput =
  {
    NOT: {
      OR: [
        {
          ownerUser: {
            loginId: { startsWith: EXTERNAL_REGISTRATION_GYM_LOGIN_PREFIX },
          },
        },
        {
          name: { startsWith: EXTERNAL_REGISTRATION_GYM_NAME_PREFIX },
        },
      ],
    },
  };

/**
 * 신청/대진 표시용 체육관명 SSOT.
 * 1) gymNameSnapshot (1급 컬럼)
 * 2) gymSnapshot.name
 * 3) 실제 등록 Gym.name (placeholder 제외)
 * 4) "—"
 *
 * placeholder Gym.name 을 사용자에게 노출하지 않는다.
 */
export function resolveApplicationGymDisplayName(input: {
  gymNameSnapshot?: string | null;
  gymSnapshot: unknown;
  gymRelationName: string | null | undefined;
}): string {
  const fromColumn = input.gymNameSnapshot?.trim() ?? "";
  if (fromColumn && !isExternalRegistrationPlaceholderGymName(fromColumn)) {
    return fromColumn;
  }

  if (input.gymSnapshot && typeof input.gymSnapshot === "object" && !Array.isArray(input.gymSnapshot)) {
    const name = (input.gymSnapshot as Record<string, unknown>).name;
    if (typeof name === "string" && name.trim()) {
      const trimmed = name.trim();
      if (!isExternalRegistrationPlaceholderGymName(trimmed)) {
        return trimmed;
      }
    }
  }
  const relation = input.gymRelationName?.trim() ?? "";
  if (relation && !isExternalRegistrationPlaceholderGymName(relation)) {
    return relation;
  }
  return "—";
}

/** 제품 SSOT alias — EventApplication 소속 체육관 표시 */
export const getApplicationGymDisplayName = resolveApplicationGymDisplayName;

/** 저장용 gymSnapshot JSON */
export function buildApplicationGymSnapshot(input: {
  gymId: string | null;
  gymDisplayName: string;
}): { gymId: string | null; name: string } {
  return {
    gymId: input.gymId,
    name: input.gymDisplayName.trim(),
  };
}
