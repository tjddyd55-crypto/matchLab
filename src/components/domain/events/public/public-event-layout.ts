/**
 * 공개 대회 목록·메인 공고 (PC 카드 폭 340~380px 목표)
 * - lg~xl: max 1240px · 3열 → 약 370px/카드
 * - 2xl+: max 1680px · 4열 → 약 390px/카드
 */
export const PUBLIC_EVENTS_CONTAINER_CLASS =
  "mx-auto w-full max-w-[1240px] 2xl:max-w-[1680px] px-4 md:px-6";

/** gap-6 = 24px */
export const PUBLIC_EVENTS_GRID_DESKTOP_CLASS =
  "hidden gap-6 md:grid md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4";
