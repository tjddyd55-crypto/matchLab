/**
 * Server Action / Route Handler 공통 응답 (`api-contract.md` envelope와 정합).
 */

import type { PermissionDeniedReason } from "@/lib/auth/permission-error";

export type ActionErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL";

export type ActionError = {
  code: ActionErrorCode;
  message: string;
  details?: unknown;
};

export type ActionSuccess<T> = {
  ok: true;
  data: T;
};

export type ActionFailure = {
  ok: false;
  error: ActionError;
};

export type ActionResult<T> = ActionSuccess<T> | ActionFailure;

export function actionSuccess<T>(data: T): ActionSuccess<T> {
  return { ok: true, data };
}

export function actionFailure(
  code: ActionErrorCode,
  message: string,
  details?: unknown,
): ActionFailure {
  return { ok: false, error: { code, message, details } };
}

/** Route Handler JSON body (`{ data }` / `{ error }`) */
export type ApiSuccessEnvelope<T> = { data: T; meta?: Record<string, unknown> };

export type ApiErrorEnvelope = {
  error: ActionError;
};

export function toApiSuccess<T>(
  data: T,
  meta?: Record<string, unknown>,
): ApiSuccessEnvelope<T> {
  return meta ? { data, meta } : { data };
}

export function toApiError(
  code: ActionErrorCode,
  message: string,
  details?: unknown,
): ApiErrorEnvelope {
  return { error: { code, message, details } };
}

/** `PermissionError.reason` → API·Server Action 코드 매핑 */
export function permissionReasonToActionCode(
  reason: PermissionDeniedReason,
): ActionErrorCode {
  switch (reason) {
    case "UNAUTHORIZED":
      return "UNAUTHORIZED";
    case "FORBIDDEN":
      return "FORBIDDEN";
    case "NOT_FOUND":
      return "NOT_FOUND";
    default:
      return "INTERNAL";
  }
}
