import type { Prisma } from "@/generated/prisma";

/** 외부 공개등록 FK용 공용 Gym — 일반 체육관 picker/검색/디렉터리에 노출 금지 */
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

/** Prisma where — 활성 목록/피커/검색에서 placeholder Gym 제외 */
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
 * 신청/대진 표시용 체육관명 — snapshot 우선 (외부등록 실제 체육관명).
 * placeholder Gym.name 은 사용자에게 노출하지 않는다.
 */
export function resolveApplicationGymDisplayName(input: {
  gymSnapshot: unknown;
  gymRelationName: string | null | undefined;
}): string {
  if (input.gymSnapshot && typeof input.gymSnapshot === "object" && !Array.isArray(input.gymSnapshot)) {
    const name = (input.gymSnapshot as Record<string, unknown>).name;
    if (typeof name === "string" && name.trim()) {
      return name.trim();
    }
  }
  const relation = input.gymRelationName?.trim() ?? "";
  if (relation && !isExternalRegistrationPlaceholderGymName(relation)) {
    return relation;
  }
  return "—";
}
