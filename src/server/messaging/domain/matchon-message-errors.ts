export const MatchonMessagingErrorCode = {
  MESSAGING_DISABLED: "MESSAGING_DISABLED",
  MESSAGING_DRY_RUN: "MESSAGING_DRY_RUN",
  REAL_SEND_NOT_ALLOWED: "REAL_SEND_NOT_ALLOWED",
  PROVIDER_DISABLED: "PROVIDER_DISABLED",
  PROVIDER_NOT_CONFIGURED: "PROVIDER_NOT_CONFIGURED",
  INVALID_RECIPIENT: "INVALID_RECIPIENT",
  INVALID_MESSAGE: "INVALID_MESSAGE",
  TEMPLATE_NOT_FOUND: "TEMPLATE_NOT_FOUND",
  TEMPLATE_NOT_APPROVED: "TEMPLATE_NOT_APPROVED",
  TEMPLATE_FINGERPRINT_MISMATCH: "TEMPLATE_FINGERPRINT_MISMATCH",
  TEMPLATE_VARIABLE_MISSING: "TEMPLATE_VARIABLE_MISSING",
  PROVIDER_TIMEOUT: "PROVIDER_TIMEOUT",
  PROVIDER_REJECTED: "PROVIDER_REJECTED",
  PROVIDER_NETWORK_ERROR: "PROVIDER_NETWORK_ERROR",
  DUPLICATE_IDEMPOTENCY_KEY: "DUPLICATE_IDEMPOTENCY_KEY",
  OWNER_SCOPE_MISMATCH: "OWNER_SCOPE_MISMATCH",
  GYM_SCOPE_MISMATCH: "GYM_SCOPE_MISMATCH",
  ADMIN_UI_DISABLED: "ADMIN_UI_DISABLED",
  GYM_UI_DISABLED: "GYM_UI_DISABLED",
  FORBIDDEN: "FORBIDDEN",
} as const;

export type MatchonMessagingErrorCode =
  (typeof MatchonMessagingErrorCode)[keyof typeof MatchonMessagingErrorCode];

export class MatchonMessagingError extends Error {
  constructor(
    public readonly code: MatchonMessagingErrorCode,
    message: string,
    public readonly technicalDetail?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "MatchonMessagingError";
  }
}

export function userMessageForMessagingCode(code: MatchonMessagingErrorCode): string {
  switch (code) {
    case MatchonMessagingErrorCode.MESSAGING_DISABLED:
      return "메시징 기능이 비활성화되어 있습니다.";
    case MatchonMessagingErrorCode.MESSAGING_DRY_RUN:
      return "테스트 모드입니다. 실제 문자·알림톡은 발송되지 않습니다.";
    case MatchonMessagingErrorCode.REAL_SEND_NOT_ALLOWED:
      return "실발송이 허용되지 않았습니다.";
    case MatchonMessagingErrorCode.PROVIDER_DISABLED:
      return "해당 발송 채널이 비활성화되어 있습니다.";
    case MatchonMessagingErrorCode.PROVIDER_NOT_CONFIGURED:
      return "발송 설정이 완료되지 않았습니다.";
    case MatchonMessagingErrorCode.INVALID_RECIPIENT:
      return "수신 전화번호가 올바르지 않습니다.";
    case MatchonMessagingErrorCode.INVALID_MESSAGE:
      return "메시지 내용이 올바르지 않습니다.";
    case MatchonMessagingErrorCode.TEMPLATE_NOT_FOUND:
      return "템플릿을 찾을 수 없습니다.";
    case MatchonMessagingErrorCode.TEMPLATE_NOT_APPROVED:
      return "승인되지 않은 알림톡 템플릿입니다.";
    case MatchonMessagingErrorCode.TEMPLATE_FINGERPRINT_MISMATCH:
      return "승인된 템플릿 원문이 변경되어 발송할 수 없습니다.";
    case MatchonMessagingErrorCode.TEMPLATE_VARIABLE_MISSING:
      return "필수 템플릿 변수가 누락되었습니다.";
    case MatchonMessagingErrorCode.DUPLICATE_IDEMPOTENCY_KEY:
      return "동일한 요청이 이미 처리되었습니다.";
    case MatchonMessagingErrorCode.OWNER_SCOPE_MISMATCH:
    case MatchonMessagingErrorCode.GYM_SCOPE_MISMATCH:
      return "요청 범위가 올바르지 않습니다.";
    case MatchonMessagingErrorCode.FORBIDDEN:
      return "권한이 없습니다.";
    default:
      return "메시징 요청을 처리할 수 없습니다.";
  }
}
