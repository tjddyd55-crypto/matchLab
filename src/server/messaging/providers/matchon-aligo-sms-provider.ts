import type { MatchonMessagingConfig } from "../config/matchon-messaging-config";
import {
  canMatchonRealSend,
  hasMatchonSmsCredentials,
} from "../config/matchon-messaging-config";
import {
  MatchonMessagingErrorCode,
} from "../domain/matchon-message-errors";
import type {
  ProviderConfigurationResult,
  ProviderSendRequest,
  ProviderSendResult,
} from "../domain/matchon-message-types";
import type { MatchonMessagingProvider } from "./matchon-messaging-provider";
import type { MatchonAligoTransport } from "../transport/matchon-aligo-transport";
import { classifyMatchonSmsMessage } from "../utils/matchon-sms-length";
import { validateMatchonPhone } from "../utils/matchon-phone";
import { summarizeProviderPayload } from "../utils/matchon-secret-mask";

/**
 * MATCHON 전용 알리고 SMS adapter.
 * transport는 주입받으며, 실발송 가드 실패 시 transport를 호출하지 않는다.
 */
export class MatchonAligoSmsProvider implements MatchonMessagingProvider {
  readonly channel = "sms" as const;

  constructor(
    private readonly config: MatchonMessagingConfig,
    private readonly transport: MatchonAligoTransport,
    private readonly options?: {
      commandAllowRealSend?: boolean;
    },
  ) {}

  async validateConfiguration(): Promise<ProviderConfigurationResult> {
    if (!this.config.sms.enabled) {
      return {
        ok: false,
        code: MatchonMessagingErrorCode.PROVIDER_DISABLED,
        message: "SMS provider disabled",
      };
    }
    if (!hasMatchonSmsCredentials(this.config)) {
      return {
        ok: false,
        code: MatchonMessagingErrorCode.PROVIDER_NOT_CONFIGURED,
        message: "SMS credentials missing",
      };
    }
    return { ok: true };
  }

  private realSendAllowed(): boolean {
    return (
      canMatchonRealSend(this.config) &&
      this.options?.commandAllowRealSend === true &&
      this.config.sms.enabled &&
      hasMatchonSmsCredentials(this.config)
    );
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
        providerCode: MatchonMessagingErrorCode.INVALID_RECIPIENT,
        providerMessage: phone.message,
      };
    }

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
        providerCode: MatchonMessagingErrorCode.INVALID_MESSAGE,
        providerMessage: cls.validationMessage,
      };
    }

    // 2차 차단 — kill switch / dry-run / credentials
    if (!this.realSendAllowed()) {
      return {
        accepted: true,
        dryRun: true,
        retryable: false,
        providerCode: "DRY_RUN",
        providerMessage:
          "실발송 가드로 차단되어 외부 API를 호출하지 않았습니다.",
        rawResponseSummary: "blocked_by_real_send_guard",
      };
    }

    const form: Record<string, string> = {
      key: this.config.sms.apiKey,
      user_id: this.config.sms.userId,
      sender: this.config.sms.sender,
      receiver: phone.normalized,
      msg: request.body,
      msg_type: cls.type === "lms" ? "LMS" : "SMS",
    };
    if (cls.type === "lms" && request.subject) {
      form.title = request.subject;
    }

    const res = await this.transport.request({
      url: this.config.sms.baseUrl,
      form,
      timeoutMs: this.config.providerTimeoutMs,
      requestId: `${request.dispatchId}:${request.recipientId}`,
    });

    if (res.errorCode === "PROVIDER_TIMEOUT") {
      return {
        accepted: false,
        dryRun: false,
        retryable: true,
        providerCode: MatchonMessagingErrorCode.PROVIDER_TIMEOUT,
        providerMessage: "발송 시간 초과",
        rawResponseSummary: res.summary,
      };
    }
    if (res.errorCode === "PROVIDER_NETWORK_ERROR") {
      return {
        accepted: false,
        dryRun: false,
        retryable: true,
        providerCode: MatchonMessagingErrorCode.PROVIDER_NETWORK_ERROR,
        providerMessage: "네트워크 오류",
        rawResponseSummary: res.summary,
      };
    }

    const data = res.data as { result_code?: string | number; message?: string; msg_id?: string };
    const resultCode = String(data?.result_code ?? "");
    if (resultCode === "1") {
      return {
        accepted: true,
        dryRun: false,
        retryable: false,
        providerMessageId: data?.msg_id ? String(data.msg_id) : undefined,
        providerCode: "OK",
        providerMessage: data?.message ? String(data.message) : "accepted",
        sentAt: new Date(),
        rawResponseSummary: summarizeProviderPayload({
          result_code: resultCode,
          msg_id: data?.msg_id,
        }),
      };
    }

    return {
      accepted: false,
      dryRun: false,
      retryable: false,
      providerCode: MatchonMessagingErrorCode.PROVIDER_REJECTED,
      providerMessage: data?.message ? String(data.message) : "rejected",
      rawResponseSummary: summarizeProviderPayload({ result_code: resultCode }),
    };
  }
}
