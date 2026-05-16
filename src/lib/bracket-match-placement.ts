import { AppError } from "@/lib/errors/app-error";

/** match_list 저장·UI 필터 공통 행 타입 */
export type MatchListPlacementRow = {
  fighterRedId?: string;
  fighterBlueId?: string;
  matchOrder: number;
};

/**
 * 브래킷 match_list 전체 행에 대한 중복·동일 슬롯 검증 (DB 쓰기 전).
 */
export function validateMatchListPlacement(rows: MatchListPlacementRow[]): void {
  const seenFighterIds = new Set<string>();

  rows.forEach((row, index) => {
    const red = row.fighterRedId?.trim() || undefined;
    const blue = row.fighterBlueId?.trim() || undefined;

    if (!red && !blue) {
      return;
    }

    if (red && blue && red === blue) {
      throw new AppError(
        "VALIDATION_ERROR",
        `경기 ${index + 1}: 레드와 블루에 같은 선수를 지정할 수 없습니다.`,
      );
    }

    for (const fighterId of [red, blue].filter(Boolean) as string[]) {
      if (seenFighterIds.has(fighterId)) {
        throw new AppError(
          "CONFLICT",
          "같은 선수가 여러 경기에 중복 배치되어 저장할 수 없습니다.",
        );
      }
      seenFighterIds.add(fighterId);
    }
  });
}

/**
 * match_list 편집 UI — 다른 슬롯에 이미 배치된 fighterId는 선택 목록에서 제외.
 */
export function getMatchListDisabledFighterIds(
  rows: ReadonlyArray<{ fighterRedId: string; fighterBlueId: string }>,
  rowIndex: number,
  slot: "red" | "blue",
): Set<string> {
  const disabled = new Set<string>();

  rows.forEach((row, i) => {
    const red = row.fighterRedId.trim();
    const blue = row.fighterBlueId.trim();

    if (red) {
      const isCurrent = i === rowIndex && slot === "red";
      if (!isCurrent) disabled.add(red);
    }
    if (blue) {
      const isCurrent = i === rowIndex && slot === "blue";
      if (!isCurrent) disabled.add(blue);
    }

    if (i === rowIndex) {
      if (slot === "red" && blue) disabled.add(blue);
      if (slot === "blue" && red) disabled.add(red);
    }
  });

  const current =
    slot === "red" ? rows[rowIndex]?.fighterRedId.trim() : rows[rowIndex]?.fighterBlueId.trim();
  if (current) disabled.delete(current);

  return disabled;
}

/**
 * single_elimination 등 기존 매치 목록 기준 — 해당 매치·슬롯의 현재 값은 유지.
 */
export function getBracketDisabledFighterIds(
  matches: ReadonlyArray<{
    id: string;
    fighterRedId: string | null;
    fighterBlueId: string | null;
  }>,
  excludeMatchId: string,
  slot: "red" | "blue",
): Set<string> {
  const disabled = new Set<string>();

  for (const m of matches) {
    const red = m.fighterRedId ?? "";
    const blue = m.fighterBlueId ?? "";

    if (red) {
      const isCurrent = m.id === excludeMatchId && slot === "red";
      if (!isCurrent) disabled.add(red);
    }
    if (blue) {
      const isCurrent = m.id === excludeMatchId && slot === "blue";
      if (!isCurrent) disabled.add(blue);
    }

    if (m.id === excludeMatchId) {
      if (slot === "red" && blue) disabled.add(blue);
      if (slot === "blue" && red) disabled.add(red);
    }
  }

  return disabled;
}
