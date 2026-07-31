/**
 * 선생님 계정 상태 표시 SSOT.
 * 클라이언트 컴포넌트에서도 import 하므로 node 전용 모듈에 의존하지 않는다.
 */
export type GymStaffAccountStatusKind =
  | "no_account"
  | "active"
  | "password_change_required"
  /** @deprecated 링크 발급 방식 — UI에서 더 이상 쓰지 않음 */
  | "setup_link_active"
  | "setup_link_expired";

export const GYM_STAFF_ACCOUNT_STATUS_LABEL: Record<
  GymStaffAccountStatusKind,
  string
> = {
  no_account: "계정 없음",
  active: "사용 중",
  password_change_required: "비밀번호 변경 필요",
  setup_link_active: "설정 링크 발급",
  setup_link_expired: "링크 만료",
};
