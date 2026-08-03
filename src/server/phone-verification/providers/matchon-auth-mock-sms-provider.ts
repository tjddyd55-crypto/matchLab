import "server-only";

import type {
  MatchonAuthSmsProvider,
  MatchonAuthSmsSendInput,
  MatchonAuthSmsSendResult,
} from "./matchon-auth-sms-provider";

/** 외부 API 호출 없음. E2E inbox는 서비스 계층에서 별도 적재. */
export class MatchonAuthMockSmsProvider implements MatchonAuthSmsProvider {
  readonly name = "mock";

  async sendVerificationSms(
    _input: MatchonAuthSmsSendInput,
  ): Promise<MatchonAuthSmsSendResult> {
    return {
      accepted: true,
      dryRun: true,
      providerMessage: "mock_accepted",
    };
  }
}
