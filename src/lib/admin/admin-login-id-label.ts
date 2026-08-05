export function formatStoredAdminLoginId(
  loginId: string | null | undefined,
): string {
  const value = loginId?.trim() ?? "";
  if (!value || value.startsWith("pending-gym-")) return "계정 생성 전";
  return value;
}

export function formatInquiryLoginId(
  loginId: string | null | undefined,
): string {
  const value = loginId?.trim() ?? "";
  return value || "확인 불가";
}
