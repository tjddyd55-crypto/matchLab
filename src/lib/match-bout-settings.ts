const BOUT_PREFIX = "@matchon_bout:";

export type MatchBoutSettings = {
  isPublicSparring: boolean;
};

export const DEFAULT_MATCH_BOUT_SETTINGS: MatchBoutSettings = {
  isPublicSparring: false,
};

export function parseMatchBoutSettings(
  resultMemo: string | null | undefined,
): { settings: MatchBoutSettings; hasExplicitBoutLine: boolean } {
  const raw = resultMemo?.trim() ?? "";
  const boutLine = raw.split("\n").find((line) => line.startsWith(BOUT_PREFIX));
  if (!boutLine) {
    return { settings: { ...DEFAULT_MATCH_BOUT_SETTINGS }, hasExplicitBoutLine: false };
  }
  try {
    const parsed = JSON.parse(boutLine.slice(BOUT_PREFIX.length)) as Partial<MatchBoutSettings>;
    return {
      settings: { isPublicSparring: Boolean(parsed.isPublicSparring) },
      hasExplicitBoutLine: true,
    };
  } catch {
    return { settings: { ...DEFAULT_MATCH_BOUT_SETTINGS }, hasExplicitBoutLine: true };
  }
}

export function encodeMatchBoutSettings(settings: MatchBoutSettings): string {
  return `${BOUT_PREFIX}${JSON.stringify({ isPublicSparring: settings.isPublicSparring })}`;
}

export function resolveMatchIsPublicSparring(input: {
  bracketType: string;
  bracketIsPublic?: boolean | null;
  resultMemo?: string | null;
}): boolean {
  if (input.bracketType === "single_elimination") return false;
  const parsed = parseMatchBoutSettings(input.resultMemo);
  if (parsed.hasExplicitBoutLine) {
    return parsed.settings.isPublicSparring;
  }
  return Boolean(input.bracketIsPublic);
}
