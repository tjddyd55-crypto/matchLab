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

    const form = new URLSearchParams();
    form.set("key", this.config.aligo.apiKey);
    form.set("user_id", this.config.aligo.userId);
    form.set("sender", this.config.aligo.sender);
    form.set("receiver", input.phoneNormalized);
    form.set("msg", input.body);
    // 인증 SMS는 테스트모드로 보내지 않는다. 실발송 게이트가 이미 통과한 경우만 호출.
    form.set("testmode_yn", "N");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(this.config.aligo.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
        signal: controller.signal,
      });
      const text = await res.text();
      let resultCode = "";
      try {
        const json = JSON.parse(text) as { result_code?: string | number };
        resultCode = String(json.result_code ?? "");
      } catch {
        resultCode = "";
      }
      const ok = resultCode === "1";
      return {
        accepted: ok,
        dryRun: false,
        providerMessage: ok ? "aligo_accepted" : "aligo_rejected",
      };
    } catch {
      return {
        accepted: false,
        dryRun: false,
        providerMessage: "aligo_transport_error",
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
