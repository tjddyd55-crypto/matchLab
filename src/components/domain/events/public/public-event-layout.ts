import { cn } from "@/lib/utils";

/**
 * 공개 페이지(메인·목록·상세) 공통 컨테이너·포스터·그리드
 * - Hero·Header·대회 공고·/events·상세가 동일한 좌측 시작점
 * - PC 목록: max 1120px · 3열 · gap-6 · 카드 열 폭 약 320~350px
 */
export const PUBLIC_CONTENT_CONTAINER_CLASS =
  "mx-auto w-full max-w-[1120px] px-4 sm:px-6 lg:px-8";

/** 공개 대회 상세·하위 페이지(brackets/results/live) 상단 여백 */
export const PUBLIC_EVENT_PAGE_SECTION_CLASS = "py-6 md:py-10";

/** 공개 대회 상세 계열 페이지 — 컨테이너·세로 간격·상단 여백 통일 */
export const PUBLIC_EVENT_DETAIL_PAGE_CLASS = cn(
  PUBLIC_CONTENT_CONTAINER_CLASS,
  "flex flex-col gap-8 md:gap-10",
  PUBLIC_EVENT_PAGE_SECTION_CLASS,
);

/** 공개 대회 카드 — 포스터·본문 동일 좌측 기준 */
export const PUBLIC_EVENT_CARD_POSTER_PADDING_CLASS = "px-5 pt-5";
export const PUBLIC_EVENT_CARD_BODY_PADDING_CLASS = "px-5 pb-5 pt-4";

/** @deprecated PUBLIC_CONTENT_CONTAINER_CLASS 사용 */
export const PUBLIC_EVENTS_CONTAINER_CLASS = PUBLIC_CONTENT_CONTAINER_CLASS;

/** 인스타 피드형 세로 포스터 (4:5, 권장 1080×1350px) */
export const EVENT_POSTER_ASPECT_CLASS = "aspect-[4/5]";

export const EVENT_POSTER_UPLOAD_HINT =
  "권장: 1080 x 1350px, 4:5 세로형 포스터";

/** gap-6 = 24px, lg 3열 고정 */
export const PUBLIC_EVENTS_GRID_DESKTOP_CLASS =
  "hidden gap-6 md:grid md:grid-cols-2 lg:grid-cols-3";
