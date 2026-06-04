/**
 * 공개 페이지(메인·목록·상세) 공통 컨테이너·포스터·그리드
 * - Hero·Header·대회 공고·/events·상세가 동일한 좌측 시작점
 * - PC 목록: max 1180px · 3열 · gap-6
 */
export const PUBLIC_CONTENT_CONTAINER_CLASS =
  "mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8";

/** @deprecated PUBLIC_CONTENT_CONTAINER_CLASS 사용 */
export const PUBLIC_EVENTS_CONTAINER_CLASS = PUBLIC_CONTENT_CONTAINER_CLASS;

/** A2 세로 포스터 (420mm × 594mm) */
export const EVENT_POSTER_ASPECT_CLASS = "aspect-[420/594]";

/** gap-6 = 24px, lg 3열 고정 */
export const PUBLIC_EVENTS_GRID_DESKTOP_CLASS =
  "hidden gap-6 md:grid md:grid-cols-2 lg:grid-cols-3";
