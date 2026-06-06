/** SNS·웹사이트 URL 검증 — FighterProfile 저장용 */

const BLOCKED_PROTOCOLS = /^(javascript|data|vbscript):/i;
const MAX_SNS_URL_LENGTH = 200;

export type SnsPlatform =
  | "instagram"
  | "youtube"
  | "tiktok"
  | "facebook"
  | "x"
  | "website";

const PLATFORM_LABELS: Record<SnsPlatform, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  facebook: "Facebook",
  x: "X",
  website: "웹사이트",
};

export function snsPlatformLabel(platform: SnsPlatform): string {
  return PLATFORM_LABELS[platform];
}

/**
 * 저장 가능한 SNS URL인지 검증한다.
 * 빈 문자열은 허용(→ null 저장).
 */
export function validateSnsUrl(
  raw: string | undefined | null,
  platform: SnsPlatform,
): { ok: true; value: string | undefined } | { ok: false; message: string } {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { ok: true, value: undefined };

  if (trimmed.length > MAX_SNS_URL_LENGTH) {
    return {
      ok: false,
      message: `${snsPlatformLabel(platform)} 링크는 ${MAX_SNS_URL_LENGTH}자 이하여야 합니다.`,
    };
  }

  if (BLOCKED_PROTOCOLS.test(trimmed)) {
    return { ok: false, message: "허용되지 않는 URL 형식입니다." };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return {
      ok: false,
      message: `${snsPlatformLabel(platform)} 링크는 https:// 로 시작하는 전체 URL을 입력해 주세요.`,
    };
  }

  if (url.protocol !== "https:") {
    return {
      ok: false,
      message: `${snsPlatformLabel(platform)} 링크는 https:// 로 시작해야 합니다.`,
    };
  }

  return { ok: true, value: url.toString() };
}
