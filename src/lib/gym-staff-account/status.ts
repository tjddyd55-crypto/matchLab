/**
 * 선생님 계정 상태 표시 SSOT.
 * 클라이언트 컴포넌트에서도 import 하므로 node 전용 모듈(crypto 등)에 의존하지 않는다.
 */
export type GymStaffAccountStatusKind =
  | "no_account"
  | "setup_link_active"
  | "setup_link_expired"
  | "active";

export const GYM_STAFF_ACCOUNT_STATUS_LABEL: Record<
  GymStaffAccountStatusKind,
  string
> = {
  no_account: "계정 미설정",
  setup_link_active: "설정 링크 발급",
  setup_link_expired: "링크 만료",
  active: "계정 사용 중",
};
