/**
 * 관리자 발급형 비밀번호 재설정 링크 config SSOT.
 * SMS provider와 독립적으로 동작한다.
 */

export type MatchonAdminPasswordResetLinkConfig = {
  enabled: boolean;
  ttlMs: number;
  challengeTtlMs: number;
  reissueMinIntervalMs: number;
  maxIssuesPerAdminPerHour: number;
  maxIssuesPerTargetPerHour: number;
  pepper: string;
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

function isProductionRuntime(env: NodeJS.ProcessEnv): boolean {
  const railwayEnv = String(env.RAILWAY_ENVIRONMENT_NAME ?? "")
    .trim()
    .toLowerCase();
  if (railwayEnv === "production") return true;
  if (railwayEnv && railwayEnv !== "production") return false;
  return env.NODE_ENV === "production";
}

export function loadMatchonAdminPasswordResetLinkConfig(
  env: NodeJS.ProcessEnv = process.env,
): MatchonAdminPasswordResetLinkConfig {
  const isProd = isProductionRuntime(env);
  const pepper =
    envStr(env.MATCHON_ADMIN_PASSWORD_RESET_PEPPER) ||
    envStr(env.MATCHON_PHONE_VERIFICATION_PEPPER) ||
    envStr(env.MEMBER_GYM_JOIN_URL_SECRET) ||
    envStr(env.SUPABASE_SERVICE_ROLE_KEY).slice(0, 48);

  // TTL: default 30m, hard cap 60m
  const ttlRaw = envInt(env.MATCHON_ADMIN_PASSWORD_RESET_TTL_MS, 30 * 60_000);
  const ttlMs = Math.min(ttlRaw, 60 * 60_000);

  return {
    enabled: envBool(
      env.MATCHON_ADMIN_PASSWORD_RESET_LINK_ENABLED,
      !isProd,
    ),
    ttlMs,
    challengeTtlMs: envInt(
      env.MATCHON_ADMIN_PASSWORD_RESET_CHALLENGE_TTL_MS,
      Math.min(ttlMs, 30 * 60_000),
    ),
    reissueMinIntervalMs: envInt(
      env.MATCHON_ADMIN_PASSWORD_RESET_REISSUE_MIN_MS,
      60_000,
    ),
    maxIssuesPerAdminPerHour: envInt(
      env.MATCHON_ADMIN_PASSWORD_RESET_MAX_PER_ADMIN_HOUR,
      30,
    ),
    maxIssuesPerTargetPerHour: envInt(
      env.MATCHON_ADMIN_PASSWORD_RESET_MAX_PER_TARGET_HOUR,
      5,
    ),
    pepper,
  };
}
