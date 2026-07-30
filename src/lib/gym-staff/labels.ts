/**
 * 선생님(직원) 도메인 표시 라벨·선택 옵션 SSOT.
 * 서버/클라이언트 양쪽에서 쓰이므로 node 전용 모듈에 의존하지 않는다.
 */
import { GymStaffAssignmentType, GymStaffRole } from "@/lib/enums";

export const GYM_STAFF_ROLE_LABEL: Record<GymStaffRole, string> = {
  [GymStaffRole.owner]: "관장",
  [GymStaffRole.manager]: "관리자",
  [GymStaffRole.instructor]: "선생님",
  [GymStaffRole.trainer]: "트레이너",
  [GymStaffRole.desk]: "데스크",
};

/** 등록 폼 표시 순서 */
export const GYM_STAFF_ROLE_OPTIONS: readonly {
  value: GymStaffRole;
  label: string;
}[] = [
  GymStaffRole.instructor,
  GymStaffRole.trainer,
  GymStaffRole.manager,
  GymStaffRole.desk,
  GymStaffRole.owner,
].map((value) => ({ value, label: GYM_STAFF_ROLE_LABEL[value] }));

export const GYM_STAFF_ASSIGNMENT_TYPE_LABEL: Record<
  GymStaffAssignmentType,
  string
> = {
  [GymStaffAssignmentType.PT]: "개인 지도",
  [GymStaffAssignmentType.GROUP]: "그룹 수업",
  [GymStaffAssignmentType.GENERAL]: "일반 담당",
  [GymStaffAssignmentType.OTHER]: "기타",
};

export const GYM_STAFF_ASSIGNMENT_TYPE_OPTIONS: readonly {
  value: GymStaffAssignmentType;
  label: string;
}[] = [
  GymStaffAssignmentType.GENERAL,
  GymStaffAssignmentType.PT,
  GymStaffAssignmentType.GROUP,
  GymStaffAssignmentType.OTHER,
].map((value) => ({ value, label: GYM_STAFF_ASSIGNMENT_TYPE_LABEL[value] }));

export function getGymStaffRoleLabel(role: GymStaffRole): string {
  return GYM_STAFF_ROLE_LABEL[role] ?? role;
}
