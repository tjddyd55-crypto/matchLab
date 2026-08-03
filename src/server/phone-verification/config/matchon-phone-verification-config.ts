/**
 * MATCHON 휴대폰 OTP 설정 SSOT.
 * 보험 CRM credential / INSURANCE_* env를 읽지 않는다.
 * 순수 config 로더라 verify 스크립트에서도 import 가능 (server-only 없음).
 */

export type MatchonAuthSmsProviderName = "mock" | "aligo";

export type MatchonPhoneVerificationConfig = {
  provider: MatchonAuthSmsProviderName;
  dryRun: boolean;
  allowRealSend: boolean;
  e2eInboxEnabled: boolean;
  codeLength: number;
  codeTtlMs: number;
  resendCooldownMs: number;
  maxVerifyAttempts: number;
  maxSendsPerPhonePerHour: number;
  maxSendsPerIpPerMinute: number;
  maxSendsPerIpPerHour: number;
  verificationTokenTtlMs: number;
  pepper: string;
  aligo: {
    apiKey: string;
    userId: string;
    sender: string;
    baseUrl: string;
  };
};

function envBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw == null || raw.trim() === "") return fallback;
  const v = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return fallback;
}

function envStr(raw: string | undefined): string {
  return (raw ?? "").trim();
}

function envInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/**
 * Production 런타임 판별.
 * Railway Development/Preview는 NODE_ENV=production 으로 빌드되지만
 * RAILWAY_ENVIRONMENT_NAME=development 이므로 E2E inbox를 허용할 수 있다.
 * Production 환경명일 때만 강제 차단한다.
 */
export function isMatchonProductionRuntime(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const railwayEnv = String(env.RAILWAY_ENVIRONMENT_NAME ?? "")
    .trim()
    .toLowerCase();
  if (railwayEnv === "production") return true;
  if (railwayEnv && railwayEnv !== "production") return false;
  return env.NODE_ENV === "production";
}

export function loadMatchonPhoneVerificationConfig(
  env: NodeJS.ProcessEnv = process.env,
): MatchonPhoneVerificationConfig {
  const providerRaw = envStr(env.MATCHON_AUTH_SMS_PROVIDER).toLowerCase();
  const provider: MatchonAuthSmsProviderName =
    providerRaw === "aligo" ? "aligo" : "mock";

  const pepper =
    envStr(env.MATCHON_PHONE_VERIFICATION_PEPPER) ||
    envStr(env.MEMBER_GYM_JOIN_URL_SECRET) ||
    envStr(env.SUPABASE_SERVICE_ROLE_KEY).slice(0, 48);

  return {
    provider,
    dryRun: envBool(env.MATCHON_AUTH_SMS_DRY_RUN, true),
    allowRealSend: envBool(env.MATCHON_AUTH_SMS_ALLOW_REAL_SEND, false),
    e2eInboxEnabled: envBool(env.MATCHON_AUTH_SMS_E2E_INBOX_ENABLED, false),
    codeLength: envInt(env.MATCHON_AUTH_SMS_CODE_LENGTH, 6),
    codeTtlMs: envInt(env.MATCHON_AUTH_SMS_CODE_TTL_MS, 5 * 60_000),
    resendCooldownMs: envInt(env.MATCHON_AUTH_SMS_RESEND_COOLDOWN_MS, 60_000),
    maxVerifyAttempts: envInt(env.MATCHON_AUTH_SMS_MAX_ATTEMPTS, 5),
    maxSendsPerPhonePerHour: envInt(
      env.MATCHON_AUTH_SMS_MAX_SENDS_PER_PHONE_HOUR,
      5,
    ),
    maxSendsPerIpPerMinute: envInt(env.MATCHON_AUTH_SMS_MAX_SENDS_IP_MINUTE, 5),
    maxSendsPerIpPerHour: envInt(env.MATCHON_AUTH_SMS_MAX_SENDS_IP_HOUR, 20),
    verificationTokenTtlMs: envInt(
      env.MATCHON_AUTH_SMS_TOKEN_TTL_MS,
      10 * 60_000,
    ),
    pepper,
    aligo: {
      // MATCHON 전용 Aligo — 메시징과 동일 credential 키 재사용 가능 (보험 CRM 분리)
      apiKey:
        envStr(env.MATCHON_AUTH_ALIGO_API_KEY) ||
        envStr(env.MATCHON_ALIGO_SMS_API_KEY),
      userId:
        envStr(env.MATCHON_AUTH_ALIGO_USER_ID) ||
        envStr(env.MATCHON_ALIGO_SMS_USER_ID),
      sender: (
        envStr(env.MATCHON_AUTH_ALIGO_SENDER) ||
        envStr(env.MATCHON_ALIGO_SMS_SENDER)
      ).replace(/\D/g, ""),
      baseUrl:
        envStr(env.MATCHON_AUTH_ALIGO_BASE_URL) ||
        envStr(env.MATCHON_ALIGO_SMS_BASE_URL) ||
        "https://apis.aligo.in/send/",
    },
  };
}

export function canMatchonAuthSmsRealSend(
  config: MatchonPhoneVerificationConfig,
): boolean {
  return (
    config.provider === "aligo" &&
    !config.dryRun &&
    config.allowRealSend &&
    Boolean(config.aligo.apiKey && config.aligo.userId && config.aligo.sender)
  );
}

export function assertMatchonAuthSmsProviderConfigured(
  config: MatchonPhoneVerificationConfig,
): void {
  if (config.provider === "mock") return;
  if (config.provider === "aligo") {
    if (!config.aligo.apiKey || !config.aligo.userId || !config.aligo.sender) {
      throw new Error(
        "MATCHON_AUTH_SMS_PROVIDER=aligo 이지만 Aligo credential이 없습니다.",
      );
    }
  }
}
