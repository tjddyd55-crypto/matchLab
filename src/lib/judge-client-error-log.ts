export const JUDGE_CLIENT_ERROR_LOG_PREFIX = "[judge-client-error]";

export const JUDGE_CLIENT_ERROR_MAX_BODY_BYTES = 8192;
export const JUDGE_CLIENT_ERROR_MAX_MESSAGE = 500;
export const JUDGE_CLIENT_ERROR_MAX_STACK_HEAD = 2000;
export const JUDGE_CLIENT_ERROR_MAX_PATHNAME = 200;
export const JUDGE_CLIENT_ERROR_MAX_USER_AGENT = 300;
export const JUDGE_CLIENT_ERROR_MAX_STACK_LINES = 8;

export type JudgeClientErrorLogPayload = {
  scope: string;
  message: string;
  digest: string | null;
  stackHead: string | null;
  pathname: string;
  searchKeys: string[];
  hasEventId: boolean;
  hasToken: boolean;
  target: string | null;
  userAgent: string;
};

function trimString(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

function trimStringArray(value: unknown, maxItems = 20): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function trimBoolean(value: unknown): boolean {
  return value === true;
}

/** token/eventId 원문은 저장하지 않고 allowlist 필드만 추출한다. */
export function sanitizeJudgeClientErrorPayload(
  body: unknown,
): JudgeClientErrorLogPayload | null {
  if (!body || typeof body !== "object") return null;

  const record = body as Record<string, unknown>;
  const scope = trimString(record.scope, 64);
  const message = trimString(record.message, JUDGE_CLIENT_ERROR_MAX_MESSAGE);
  if (!scope || !message) return null;

  const digest = trimString(record.digest, 128);
  const stackHead = trimString(record.stackHead, JUDGE_CLIENT_ERROR_MAX_STACK_HEAD);
  const pathname = trimString(record.pathname, JUDGE_CLIENT_ERROR_MAX_PATHNAME);
  const userAgent = trimString(record.userAgent, JUDGE_CLIENT_ERROR_MAX_USER_AGENT);
  if (!pathname || !userAgent) return null;

  const target = trimString(record.target, 16);
  if (target && target !== "score" && target !== "head") return null;

  return {
    scope,
    message,
    digest,
    stackHead,
    pathname,
    searchKeys: trimStringArray(record.searchKeys),
    hasEventId: trimBoolean(record.hasEventId),
    hasToken: trimBoolean(record.hasToken),
    target,
    userAgent,
  };
}
