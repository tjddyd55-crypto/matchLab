import "server-only";

export type MatchonAuthSmsSendInput = {
  phoneNormalized: string;
  /** 메시지 본문 — 호출측에서 코드 포함. provider는 로그에 본문/번호를 남기지 않는다. */
  body: string;
};

export type MatchonAuthSmsSendResult = {
  accepted: boolean;
  dryRun: boolean;
  providerMessage?: string;
  blocked?: boolean;
  blockedReason?: string;
};

export interface MatchonAuthSmsProvider {
  readonly name: string;
  sendVerificationSms(
    input: MatchonAuthSmsSendInput,
  ): Promise<MatchonAuthSmsSendResult>;
}
