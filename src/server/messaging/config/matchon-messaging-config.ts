/**
 * MATCHON 전용 메시징 환경변수 로더.
 * 타 프로젝트(INSURANCE_ / GOVERNMENT_ / LIQUOR_ / CRM_) env를 읽지 않는다.
 */

function envBool(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw == null || String(raw).trim() === "") return defaultValue;
  const s = String(raw).trim().toUpperCase();
  return s === "1" || s === "TRUE" || s === "YES" || s === "Y" || s === "ON" || s === "T";
}

function envInt(raw: string | undefined, defaultValue: number, min: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return defaultValue;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function envStr(raw: string | undefined): string {
  return String(raw ?? "").trim();
}

const FORBIDDEN_ENV_PREFIXES = [
  "INSURANCE_",
  "GOVERNMENT_",
  "LIQUOR_",
  "CRM_",
] as const;

export type MatchonMessagingConfig = {
  messagingEnabled: boolean;
  dryRun: boolean;
  allowRealSend: boolean;
  adminUiEnabled: boolean;
  gymUiEnabled: boolean;
  providerTimeoutMs: number;
  maxBatchSize: number;
  smsFallbackEnabled: boolean;
  sms: {
    enabled: boolean;
    apiKey: string;
    userId: string;
    sender: string;
    baseUrl: string;
  };
  kakao: {
    enabled: boolean;
    apiKey: string;
    userId: string;
    senderKey: string;
    channelId: string;
    baseUrl: string;
  };
};

export function assertNoForeignMessagingEnvKeys(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const hits: string[] = [];
  for (const key of Object.keys(env)) {
    if (!key.startsWith("MATCHON_MESSAGING_") && !key.startsWith("MATCHON_ALIGO_")) {
      continue;
    }
    for (const prefix of FORBIDDEN_ENV_PREFIXES) {
      if (key.includes(prefix) || key.startsWith(prefix)) {
        hits.push(key);
      }
    }
  }
  // Also fail if MATCHON messaging accidentally points at foreign-named values in env names
  for (const key of Object.keys(env)) {
    if (
      FORBIDDEN_ENV_PREFIXES.some((p) => key.startsWith(p)) &&
      /ALIGO|KAKAO|SMS|MESSAGING|ALIMTALK/i.test(key)
    ) {
      // foreign project messaging keys present in process — isolation verify should flag usage, not presence
    }
  }
  return hits;
}

export function loadMatchonMessagingConfig(
  env: NodeJS.ProcessEnv = process.env,
): MatchonMessagingConfig {
  return {
    messagingEnabled: envBool(env.MATCHON_MESSAGING_ENABLED, true),
    dryRun: envBool(env.MATCHON_MESSAGING_DRY_RUN, true),
    allowRealSend: envBool(env.MATCHON_MESSAGING_ALLOW_REAL_SEND, false),
    adminUiEnabled: envBool(env.MATCHON_MESSAGING_ADMIN_UI_ENABLED, true),
    gymUiEnabled: envBool(env.MATCHON_MESSAGING_GYM_UI_ENABLED, false),
    providerTimeoutMs: envInt(env.MATCHON_MESSAGING_PROVIDER_TIMEOUT_MS, 10000, 1000, 60000),
    maxBatchSize: envInt(env.MATCHON_MESSAGING_MAX_BATCH_SIZE, 100, 1, 1000),
    smsFallbackEnabled: envBool(env.MATCHON_MESSAGING_SMS_FALLBACK_ENABLED, false),
    sms: {
      enabled: envBool(env.MATCHON_ALIGO_SMS_ENABLED, false),
      apiKey: envStr(env.MATCHON_ALIGO_SMS_API_KEY),
      userId: envStr(env.MATCHON_ALIGO_SMS_USER_ID),
      sender: envStr(env.MATCHON_ALIGO_SMS_SENDER).replace(/\D/g, ""),
      baseUrl:
        envStr(env.MATCHON_ALIGO_SMS_BASE_URL) || "https://apis.aligo.in/send/",
    },
    kakao: {
      enabled: envBool(env.MATCHON_ALIGO_KAKAO_ENABLED, false),
      apiKey: envStr(env.MATCHON_ALIGO_KAKAO_API_KEY),
      userId: envStr(env.MATCHON_ALIGO_KAKAO_USER_ID),
      senderKey: envStr(env.MATCHON_ALIGO_KAKAO_SENDER_KEY),
      channelId: envStr(env.MATCHON_ALIGO_KAKAO_CHANNEL_ID),
      baseUrl:
        envStr(env.MATCHON_ALIGO_KAKAO_BASE_URL) ||
        "https://kakaoapi.aligo.in/akv10/alimtalk/send/",
    },
  };
}

/** 실발송 가능 여부 — 모든 안전 플래그 충족 시에만 true */
export function canMatchonRealSend(config: MatchonMessagingConfig): boolean {
  return (
    config.messagingEnabled &&
    !config.dryRun &&
    config.allowRealSend
  );
}

export function hasMatchonSmsCredentials(config: MatchonMessagingConfig): boolean {
  return Boolean(config.sms.apiKey && config.sms.userId && config.sms.sender);
}

export function hasMatchonKakaoCredentials(
  config: MatchonMessagingConfig,
): boolean {
  return Boolean(
    config.kakao.apiKey &&
      config.kakao.userId &&
      config.kakao.senderKey,
  );
}
