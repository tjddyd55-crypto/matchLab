/**
 * 주/일 보드 레이아웃 토큰.
 *
 * `board-geometry.ts` 는 좌표 계산(수학)만 담당하고,
 * 이 파일은 그 좌표를 화면에 그리는 데 필요한 Tailwind 토큰만 담당한다.
 * 시간축 폭처럼 여러 곳에서 동일해야 하는 값은 여기서만 정의한다.
 */
import { SCHEDULE_BOARD_AXIS_WIDTH_PX } from "@/lib/gym-schedule/board-geometry";

/**
 * Tailwind v4 는 소스 파일의 문자열 리터럴을 스캔하므로
 * arbitrary value 클래스는 반드시 완성된 형태로 적어 둔다.
 * (템플릿 문자열로 조립하면 스캔되지 않는다.)
 */
export const SCHEDULE_WEEK_GRID_COLS_CLASS =
  "grid-cols-[84px_repeat(7,minmax(0,1fr))]";

/** 모바일은 축을 좁혀 카드 폭을 확보한다. */
export const SCHEDULE_DAY_GRID_COLS_CLASS =
  "grid-cols-[64px_minmax(0,1fr)] md:grid-cols-[84px_minmax(0,1fr)]";

/** 주간 현재 시간선: 시간축 오른쪽부터 일요일 끝까지. */
export const SCHEDULE_WEEK_NOW_LINE_INSET_CLASS = "left-[84px] right-0";

/** `오전 10:00` 이 한 줄로 들어가는 크기·대비. */
export const SCHEDULE_AXIS_LABEL_CLASS =
  "whitespace-nowrap text-[13px] font-medium leading-none text-matchon-text-secondary";

/** 일간 축은 모바일에서만 한 단계 축소한다. */
export const SCHEDULE_DAY_AXIS_LABEL_CLASS =
  "whitespace-nowrap text-[11px] font-medium leading-none text-matchon-text-secondary md:text-[13px]";

/**
 * 보드 z-index 계층. 값을 바꿀 때는 반드시 이 표 전체를 함께 본다.
 *
 * 1 grid/background  (기본)
 * 2 card             z-10
 * 3 nowLine          z-20  — 카드 위를 지나가되 1~2px 얇게
 * 4 cardActive       z-30  — 선택/드래그 중 원본
 * 5 stickyHeader     z-40
 * 6 dragOverlay      z-[45] — body portal, 헤더보다 위
 * 7 modal/menu       Radix portal (그 위)
 */
export const SCHEDULE_BOARD_LAYER = {
  card: "z-10",
  /** 겹친 카드 중 포인터가 올라간 카드를 앞으로 꺼낸다. */
  cardHover: "hover:z-20",
  nowLine: "z-20",
  cardActive: "z-30",
  stickyHeader: "z-40",
  dragOverlay: "z-[45]",
} as const;

/** 드래그 중 세로 자동 스크롤 대상 컨테이너 셀렉터. */
export const SCHEDULE_SCROLL_CONTAINER_SELECTOR = "[data-schedule-scroll]";

/** 요일 컬럼 셀렉터 (drop target 판정). */
export const SCHEDULE_DAY_COLUMN_SELECTOR = "[data-schedule-day]";

export { SCHEDULE_BOARD_AXIS_WIDTH_PX };
