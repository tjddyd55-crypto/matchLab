import {
  formatDivisionSportTitle,
  type EventDivisionDisplayInput,
} from "@/lib/event-division-fields";

const UNSPECIFIED_SPORT_TITLE = "(종목 미지정)";

export type DivisionSportGroup<T> = {
  sportTitle: string;
  items: T[];
};

/** 목록을 종목(section) 단위로 묶는다. row 보조 라인 대신 그룹 헤더용. */
export function groupItemsByDivisionSport<T>(
  items: T[],
  getDivision: (item: T) => EventDivisionDisplayInput | null | undefined,
): DivisionSportGroup<T>[] {
  const map = new Map<string, T[]>();
  const order: string[] = [];

  for (const item of items) {
    const sportTitle =
      formatDivisionSportTitle(getDivision(item) ?? {}) ?? UNSPECIFIED_SPORT_TITLE;
    if (!map.has(sportTitle)) {
      map.set(sportTitle, []);
      order.push(sportTitle);
    }
    map.get(sportTitle)!.push(item);
  }

  return order.map((sportTitle) => ({
    sportTitle,
    items: map.get(sportTitle)!,
  }));
}

/** 단일 종목이면 헤더 1개, 복수 종목이면 null (섹션 분리 필요). */
export function resolveSingleSportSectionTitle(
  divisions: Array<{ sportType?: string | null }>,
): string | null {
  const titles = [
    ...new Set(
      divisions
        .map((d) => formatDivisionSportTitle(d))
        .filter((x): x is string => Boolean(x)),
    ),
  ];
  return titles.length === 1 ? titles[0]! : null;
}
