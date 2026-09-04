import "server-only";

import {
  assertMatchonAuthSmsProviderConfigured,
  canMatchonAuthSmsRealSend,
  type MatchonPhoneVerificationConfig,
} from "../config/matchon-phone-verification-config";
import type {
  MatchonAuthSmsProvider,
  MatchonAuthSmsSendInput,
  MatchonAuthSmsSendResult,
} from "./matchon-auth-sms-provider";
import { MatchonAligoHttpTransport } from "@/server/messaging/transport/matchon-aligo-transport";

const ALIGO_SEND_URL = "https://apis.aligo.in/send/";

/**
 * MATCHON 전용 Aligo OTP 발송.
 * dry-run / allowRealSend 실패 시 외부 API를 호출하지 않는다.
 * credential 누락 시 mock으로 조용히 fallback 하지 않는다.
 */
export class MatchonAuthAligoSmsProvider implements MatchonAuthSmsProvider {
  readonly name = "aligo";

  constructor(private readonly config: MatchonPhoneVerificationConfig) {
    assertMatchonAuthSmsProviderConfigured(config);
  }

  async sendVerificationSms(
    input: MatchonAuthSmsSendInput,
  ): Promise<MatchonAuthSmsSendResult> {
    if (!canMatchonAuthSmsRealSend(this.config)) {
      return {
        accepted: true,
        dryRun: true,
        blocked: true,
        blockedReason: "auth_sms_real_send_blocked",
        providerMessage:
          "실발송 가드로 차단되어 외부 API를 호출하지 않았습니다.",
      };
    }

    const transport = new MatchonAligoHttpTransport();
    const res = await transport.request({
      url: this.config.aligo.baseUrl || ALIGO_SEND_URL,
      form: {
        key: this.config.aligo.apiKey,
        user_id: this.config.aligo.userId,
        sender: this.config.aligo.sender,
        receiver: input.phoneNormalized,
        msg: input.body,
        testmode_yn: "N",
      },
      timeoutMs: 10_000,
      requestId: `auth-sms-${input.phoneNormalized.slice(-4)}`,
    });

    if (res.errorCode === "PROVIDER_TIMEOUT" || res.errorCode === "PROVIDER_NETWORK_ERROR") {
      return {
        accepted: false,
        dryRun: false,
        providerMessage: "aligo_transport_error",
      };
    }

    const data = res.data as { result_code?: string | number };
    const resultCode = String(data?.result_code ?? "");
    const ok = resultCode === "1";
    return {
      accepted: ok,
      dryRun: false,
      providerMessage: ok ? "aligo_accepted" : "aligo_rejected",
    };
  }
}
