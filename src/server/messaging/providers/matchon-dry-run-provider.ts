import type { MatchonMessagingProvider } from "./matchon-messaging-provider";
import type {
  ProviderConfigurationResult,
  ProviderSendRequest,
  ProviderSendResult,
} from "../domain/matchon-message-types";
import { validateMatchonPhone } from "../utils/matchon-phone";
import { classifyMatchonSmsMessage } from "../utils/matchon-sms-length";

/**
 * 기본 provider — 외부 네트워크 호출 없음.
 */
export class MatchonDryRunProvider implements MatchonMessagingProvider {
  readonly channel;

  constructor(channel: MatchonMessagingProvider["channel"] = "sms") {
    this.channel = channel;
  }

  async validateConfiguration(): Promise<ProviderConfigurationResult> {
    return { ok: true, code: "DRY_RUN", message: "Dry-run provider" };
  }

  async send(request: ProviderSendRequest): Promise<ProviderSendResult> {
    const phone = validateMatchonPhone(request.recipientPhone);
    if (!phone.ok) {
      return {
        accepted: false,
        dryRun: true,
        retryable: false,
        blocked: true,
        blockedReason: phone.message,
        providerCode: "INVALID_RECIPIENT",
        providerMessage: phone.message,
      };
    }
    if (!request.body?.trim()) {
      return {
        accepted: false,
        dryRun: true,
        retryable: false,
        blocked: true,
        blockedReason: "본문이 비어 있습니다.",
        providerCode: "INVALID_MESSAGE",
        providerMessage: "본문이 비어 있습니다.",
      };
    }

    if (this.channel === "sms" || this.channel === "lms") {
      const cls = classifyMatchonSmsMessage({
        body: request.body,
        subject: request.subject,
      });
      if (!cls.isValid) {
        return {
          accepted: false,
          dryRun: true,
          retryable: false,
          blocked: true,
          blockedReason: cls.validationMessage,
          providerCode: "INVALID_MESSAGE",
          providerMessage: cls.validationMessage,
        };
      }
    }

    if (this.channel === "kakao_alimtalk") {
      if (!request.templateCode) {
        return {
          accepted: false,
          dryRun: true,
          retryable: false,
          blocked: true,
          blockedReason: "알림톡 template code가 없습니다.",
          providerCode: "TEMPLATE_NOT_APPROVED",
          providerMessage: "알림톡 template code가 없습니다.",
        };
      }
    }

    return {
      accepted: true,
      dryRun: true,
      retryable: false,
      providerCode: "DRY_RUN",
      providerMessage: "실제 발송 없이 검증되었습니다.",
      sentAt: new Date(),
      rawResponseSummary: "dry_run",
    };
  }
}
