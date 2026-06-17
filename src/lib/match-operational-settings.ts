const OPS_PREFIX = "@matchon_ops:";

export type MatchOperationalSettings = {
  roundCount: number;
  roundTimeSec: number;
  overtimeEnabled: boolean;
  overtimeRoundCount: number;
};

export const DEFAULT_MATCH_OPERATIONAL_SETTINGS: MatchOperationalSettings = {
  roundCount: 3,
  roundTimeSec: 180,
  overtimeEnabled: false,
  overtimeRoundCount: 0,
};

function clampRoundCount(n: number): number {
  return Math.max(1, Math.min(15, Math.round(n)));
}

function clampRoundTimeSec(n: number): number {
  return Math.max(30, Math.min(600, Math.round(n)));
}

export function parseMatchOperationalSettings(
  resultMemo: string | null | undefined,
): { settings: MatchOperationalSettings; displayMemo: string } {
  const raw = resultMemo?.trim() ?? "";
  if (!raw.includes(OPS_PREFIX)) {
    return { settings: { ...DEFAULT_MATCH_OPERATIONAL_SETTINGS }, displayMemo: raw };
  }

  const lines = raw.split("\n");
  const opsLine = lines.find((l) => l.startsWith(OPS_PREFIX));
  const displayMemo = lines.filter((l) => !l.startsWith(OPS_PREFIX)).join("\n").trim();

  if (!opsLine) {
    return { settings: { ...DEFAULT_MATCH_OPERATIONAL_SETTINGS }, displayMemo };
  }

  try {
    const parsed = JSON.parse(opsLine.slice(OPS_PREFIX.length)) as Partial<MatchOperationalSettings>;
    return {
      settings: {
        roundCount: clampRoundCount(parsed.roundCount ?? DEFAULT_MATCH_OPERATIONAL_SETTINGS.roundCount),
        roundTimeSec: clampRoundTimeSec(
          parsed.roundTimeSec ?? DEFAULT_MATCH_OPERATIONAL_SETTINGS.roundTimeSec,
        ),
        overtimeEnabled: Boolean(parsed.overtimeEnabled),
        overtimeRoundCount: clampRoundCount(
          parsed.overtimeRoundCount ?? DEFAULT_MATCH_OPERATIONAL_SETTINGS.overtimeRoundCount,
        ),
      },
      displayMemo,
    };
  } catch {
    return { settings: { ...DEFAULT_MATCH_OPERATIONAL_SETTINGS }, displayMemo };
  }
}

export function encodeMatchOperationalSettings(
  settings: MatchOperationalSettings,
  displayMemo?: string | null,
): string {
  const memo = displayMemo?.trim() ?? "";
  const opsLine = `${OPS_PREFIX}${JSON.stringify({
    roundCount: clampRoundCount(settings.roundCount),
    roundTimeSec: clampRoundTimeSec(settings.roundTimeSec),
    overtimeEnabled: settings.overtimeEnabled,
    overtimeRoundCount: settings.overtimeEnabled
      ? clampRoundCount(settings.overtimeRoundCount || 1)
      : 0,
  })}`;
  return memo ? `${memo}\n${opsLine}` : opsLine;
}

export function formatOperationalSettingsLabel(settings: MatchOperationalSettings): string {
  const base = `${settings.roundCount}R · ${Math.floor(settings.roundTimeSec / 60)}:${String(settings.roundTimeSec % 60).padStart(2, "0")}`;
  if (settings.overtimeEnabled && settings.overtimeRoundCount > 0) {
    return `${base} · 연장 ${settings.overtimeRoundCount}R`;
  }
  return base;
}
