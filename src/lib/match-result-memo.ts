import {
  encodeMatchBoutSettings,
  parseMatchBoutSettings,
} from "@/lib/match-bout-settings";
import {
  encodeMatchOperationalSettings,
  parseMatchOperationalSettings,
} from "@/lib/match-operational-settings";

const SYSTEM_PREFIXES = ["@matchon_ops:", "@matchon_bout:"];

/** 사용자 메모만 추출 (운영/대전방식 JSON 라인 제외) */
export function extractDisplayResultMemo(
  resultMemo: string | null | undefined,
): string {
  const raw = resultMemo?.trim() ?? "";
  if (!raw) return "";
  return raw
    .split("\n")
    .filter((line) => !SYSTEM_PREFIXES.some((prefix) => line.startsWith(prefix)))
    .join("\n")
    .trim();
}

/** 표시용 메모 저장 시 운영/대전방식 설정 라인은 유지 */
export function mergeDisplayResultMemo(
  existingResultMemo: string | null | undefined,
  newDisplayMemo: string | null | undefined,
): string | null {
  const display = newDisplayMemo?.trim() ?? "";
  const ops = parseMatchOperationalSettings(existingResultMemo).settings;
  const bout = parseMatchBoutSettings(existingResultMemo).settings;
  const parts = [
    display,
    encodeMatchOperationalSettings(ops, null),
    encodeMatchBoutSettings(bout),
  ].filter((line) => line.trim().length > 0);
  return parts.length > 0 ? parts.join("\n") : null;
}

export function updateMatchBoutInResultMemo(
  existingResultMemo: string | null | undefined,
  isPublicSparring: boolean,
): string {
  const display = extractDisplayResultMemo(existingResultMemo);
  const ops = parseMatchOperationalSettings(existingResultMemo).settings;
  const parts = [
    display,
    encodeMatchOperationalSettings(ops, null),
    encodeMatchBoutSettings({ isPublicSparring }),
  ].filter((line) => line.trim().length > 0);
  return parts.join("\n");
}
