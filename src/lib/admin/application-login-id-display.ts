export type ApplicationLoginIdDisplay = {
  requestedLoginIdLabel: string;
  currentLoginIdLabel: string;
  accountStatusLabel: string;
  mismatchWarning: string | null;
  activationPending: boolean;
};

function normalizeDisplayLoginId(loginId: string | null | undefined): string | null {
  const value = loginId?.trim() ?? "";
  if (!value || value.startsWith("pending-gym-")) return null;
  return value;
}

export function describeApplicationLoginIds(input: {
  requestedLoginId?: string | null;
  currentLoginId?: string | null;
  authUserId?: string | null;
  approved?: boolean;
}): ApplicationLoginIdDisplay {
  const requested = normalizeDisplayLoginId(input.requestedLoginId);
  const current = normalizeDisplayLoginId(input.currentLoginId);
  const activated = Boolean(current && input.authUserId);
  const approved = Boolean(input.approved);

  let accountStatusLabel = "신청 접수";
  if (approved && activated) accountStatusLabel = "활성화 완료";
  else if (approved) accountStatusLabel = "활성화 대기";
  else if (requested) accountStatusLabel = "신청 접수";

  return {
    requestedLoginIdLabel: requested ?? "기록 없음",
    currentLoginIdLabel: current ?? (approved ? "활성화 대기" : "계정 생성 전"),
    accountStatusLabel,
    mismatchWarning:
      requested && current && requested !== current
        ? "신청 당시 아이디와 현재 계정 아이디가 다릅니다."
        : null,
    activationPending: approved && !activated,
  };
}
