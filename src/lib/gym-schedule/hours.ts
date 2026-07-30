/** 캘린더 표시·선택 시간 범위 (운영시간 미설정 시 기본) */
export const SCHEDULE_DISPLAY_START_HM = "06:00";
export const SCHEDULE_DISPLAY_END_HM = "23:50";

/** 10분 단위 HH:mm 옵션 (06:00 ~ 23:50) */
export function buildTenMinuteTimeOptions(
  startHm = SCHEDULE_DISPLAY_START_HM,
  endHm = SCHEDULE_DISPLAY_END_HM,
): string[] {
  const parse = (hm: string) => {
    const [h, m] = hm.split(":").map(Number);
    return h * 60 + m;
  };
  const start = parse(startHm);
  const end = parse(endHm);
  const out: string[] = [];
  for (let mins = start; mins <= end; mins += 10) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return out;
}

export const TEN_MINUTE_TIME_OPTIONS = buildTenMinuteTimeOptions();
