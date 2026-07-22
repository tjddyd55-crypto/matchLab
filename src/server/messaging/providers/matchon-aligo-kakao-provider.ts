import type { MatchonMessagingConfig } from "../config/matchon-messaging-config";
import {
  canMatchonRealSend,
  hasMatchonKakaoCredentials,
} from "../config/matchon-messaging-config";
import { MatchonMessagingErrorCode } from "../domain/matchon-message-errors";
import type {
  ProviderConfigurationResult,
  ProviderSendRequest,
  ProviderSendResult,
} from "../domain/matchon-message-types";
import type { MatchonMessagingProvider } from "./matchon-messaging-provider";
import type { MatchonAligoTransport } from "../transport/matchon-aligo-transport";
import { validateMatchonPhone } from "../utils/matchon-phone";
import { summarizeProviderPayload } from "../utils/matchon-secret-mask";

export type KakaoTemplateGuard = {
  isApproved: boolean;
  kakaoTemplateCode: string | null;
  approvedFingerprint: string | null;
  currentFingerprint: string;
};

/**
 * MATCHON 전용 알리고 카카오 알림톡 adapter.
 * 미승인·fingerprint 불일치·실발송 가드 실패 시 transport 호출 0.
 */
export class MatchonAligoKakaoProvider implements MatchonMessagingProvider {
  readonly channel = "kakao_alimtalk" as const;

  constructor(
    private readonly config: MatchonMessagingConfig,
    private readonly transport: MatchonAligoTransport,
    private readonly options?: {
      commandAllowRealSend?: boolean;
      templateGuard?: KakaoTemplateGuard;
    },
  ) {}

  async validateConfiguration(): Promise<ProviderConfigurationResult> {
    if (!this.config.kakao.enabled) {
      return {
        ok: false,
        code: MatchonMessagingErrorCode.PROVIDER_DISABLED,
        message: "Kakao provider disabled",
      };
    }
    if (!hasMatchonKakaoCredentials(this.config)) {
      return {
        ok: false,
        code: MatchonMessagingErrorCode.PROVIDER_NOT_CONFIGURED,
        message: "Kakao credentials missing",
      };
    }
    return { ok: true };
  }

  private evaluateTemplateGuard(): ProviderSendResult | null {
    const g = this.options?.templateGuard;
    if (!g) {
      return {
        accepted: false,
        dryRun: true,
        retryable: false,
        blocked: true,
        blockedReason: "알림톡 템플릿 가드가 없습니다.",
        providerCode: MatchonMessagingErrorCode.TEMPLATE_NOT_APPROVED,
        providerMessage: "알림톡 템플릿 가드가 없습니다.",
      };
    }
    if (!g.isApproved || !g.kakaoTemplateCode) {
      return {
        accepted: false,
        dryRun: true,
        retryable: false,
        blocked: true,
        blockedReason: "승인되지 않은 알림톡 템플릿입니다.",
        providerCode: MatchonMessagingErrorCode.TEMPLATE_NOT_APPROVED,
        providerMessage: "승인되지 않은 알림톡 템플릿입니다.",
      };
    }
    if (
      !g.approvedFingerprint ||
      g.approvedFingerprint !== g.currentFingerprint
    ) {
      return {
        accepted: false,
        dryRun: true,
        retryable: false,
        blocked: true,
        blockedReason: "템플릿 fingerprint가 일치하지 않습니다.",
        providerCode: MatchonMessagingErrorCode.TEMPLATE_FINGERPRINT_MISMATCH,
        providerMessage: "템플릿 fingerprint가 일치하지 않습니다.",
      };
    }
    return null;
  }

  private realSendAllowed(): boolean {
    return (
      canMatchonRealSend(this.config) &&
      this.options?.commandAllowRealSend === true &&
      this.config.kakao.enabled &&
      hasMatchonKakaoCredentials(this.config)
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

    const templateBlock = this.evaluateTemplateGuard();
    if (templateBlock) return templateBlock;

    if (!request.templateCode) {
      return {
        accepted: false,
        dryRun: true,
        retryable: false,
        blocked: true,
        blockedReason: "template code 없음",
        providerCode: MatchonMessagingErrorCode.TEMPLATE_NOT_APPROVED,
        providerMessage: "template code 없음",
      };
    }

    // 알림톡 자유입력 본문 실발송 금지 — template 기반만
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
      apikey: this.config.kakao.apiKey,
      userid: this.config.kakao.userId,
      senderkey: this.config.kakao.senderKey,
      tpl_code: request.templateCode,
      receiver_1: phone.normalized,
      subject_1: request.subject ?? "",
      message_1: request.body,
    };
    if (request.recipientName) form.recvname_1 = request.recipientName;
    if (request.templateVariables) {
      Object.entries(request.templateVariables).forEach(([k, v], idx) => {
        form[`button_${idx + 1}`] = ""; // placeholder — 실제 버튼 JSON은 계정 연동 시 확장
        form[`emtitle_${idx + 1}`] = "";
        void k;
        void v;
      });
    }

    const res = await this.transport.request({
      url: this.config.kakao.baseUrl,
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

    const data = res.data as { code?: number | string; message?: string; info?: { mid?: string } };
    const code = String(data?.code ?? "");
    if (code === "0") {
      return {
        accepted: true,
        dryRun: false,
        retryable: false,
        providerMessageId: data?.info?.mid ? String(data.info.mid) : undefined,
        providerCode: "OK",
        providerMessage: data?.message ? String(data.message) : "accepted",
        sentAt: new Date(),
        rawResponseSummary: summarizeProviderPayload({ code }),
      };
    }

    return {
      accepted: false,
      dryRun: false,
      retryable: false,
      providerCode: MatchonMessagingErrorCode.PROVIDER_REJECTED,
      providerMessage: data?.message ? String(data.message) : "rejected",
      rawResponseSummary: summarizeProviderPayload({ code }),
    };
  }
}
