import type { MatchonMessagingConfig } from "../config/matchon-messaging-config";
import { canMatchonRealSend } from "../config/matchon-messaging-config";
import {
  MatchonMessagingError,
  MatchonMessagingErrorCode,
} from "./matchon-message-errors";
import type { CreateMessageDispatchCommand } from "./matchon-message-types";

export type RealSendGateResult =
  | { allowed: true }
  | { allowed: false; code: MatchonMessagingErrorCode; reason: string };

/**
 * 실발송 1차 차단 (service 계층).
 * allowRealSend kill switch가 false이면 credential/provider enabled만으로 통과하지 않는다.
 */
export function evaluateMatchonRealSendGate(params: {
  config: MatchonMessagingConfig;
  commandAllowRealSend?: boolean;
}): RealSendGateResult {
  const { config, commandAllowRealSend } = params;

  if (!config.messagingEnabled) {
    return {
      allowed: false,
      code: MatchonMessagingErrorCode.MESSAGING_DISABLED,
      reason: "MATCHON_MESSAGING_ENABLED=false",
    };
  }
  if (config.dryRun) {
    return {
      allowed: false,
      code: MatchonMessagingErrorCode.MESSAGING_DRY_RUN,
      reason: "MATCHON_MESSAGING_DRY_RUN=true",
    };
  }
  if (!config.allowRealSend) {
    return {
      allowed: false,
      code: MatchonMessagingErrorCode.REAL_SEND_NOT_ALLOWED,
      reason: "MATCHON_MESSAGING_ALLOW_REAL_SEND=false",
    };
  }
  if (!commandAllowRealSend) {
    return {
      allowed: false,
      code: MatchonMessagingErrorCode.REAL_SEND_NOT_ALLOWED,
      reason: "command.allowRealSend !== true",
    };
  }
  if (!canMatchonRealSend(config)) {
    return {
      allowed: false,
      code: MatchonMessagingErrorCode.REAL_SEND_NOT_ALLOWED,
      reason: "canMatchonRealSend=false",
    };
  }
  return { allowed: true };
}

export function assertMessagingEnabled(config: MatchonMessagingConfig) {
  if (!config.messagingEnabled) {
    throw new MatchonMessagingError(
      MatchonMessagingErrorCode.MESSAGING_DISABLED,
      "메시징 기능이 비활성화되어 있습니다.",
    );
  }
}

export function assertAdminMessagingUiEnabled(config: MatchonMessagingConfig) {
  if (!config.adminUiEnabled) {
    throw new MatchonMessagingError(
      MatchonMessagingErrorCode.ADMIN_UI_DISABLED,
      "메시징 관리자 UI가 비활성화되어 있습니다.",
    );
  }
}

export function assertOwnerScope(command: CreateMessageDispatchCommand) {
  if (command.ownerType === "gym") {
    if (!command.gymId) {
      throw new MatchonMessagingError(
        MatchonMessagingErrorCode.GYM_SCOPE_MISMATCH,
        "체육관 발송에는 gymId가 필요합니다.",
      );
    }
  }
  if (command.ownerType === "association") {
    if (!command.organizerId) {
      throw new MatchonMessagingError(
        MatchonMessagingErrorCode.GYM_SCOPE_MISMATCH,
        "협회 발송에는 organizerId가 필요합니다.",
      );
    }
  }
  if (command.ownerType === "platform" && command.gymId) {
    // platform 발송이 gymId를 가질 수는 있으나 혼입 방지를 위해 명시적만 허용 — 현재는 null 권장
  }
}

export function buildIdempotencyScope(
  ownerType: string,
  gymId?: string | null,
  organizerId?: string | null,
): string {
  if (ownerType === "gym" && gymId) return `gym:${gymId}`;
  if (ownerType === "association" && organizerId) {
    return `association:${organizerId}`;
  }
  return "platform";
}
