/** MATCHON 전역 페이지·섹션·카드 간격 SSOT (Desktop operational density) */

/** 좌우 inset은 --dashboard-content-padding-x 단일 레버 (admin/gym/organizer 정렬) */
export const matchonPageContainerClass =
  "mx-auto w-full max-w-[min(100%,96rem)] px-[var(--dashboard-content-padding-x)] py-4 md:py-5";

export const matchonPageStackClass =
  "flex min-w-0 w-full flex-col gap-4 md:gap-5";

export const matchonSectionStackClass = "space-y-4 md:space-y-5";

export const matchonCardStackClass = "flex flex-col gap-2.5 sm:gap-3";

export const matchonGridGapClass = "gap-2.5 sm:gap-3";

export const matchonPageTitleClass =
  "font-heading text-xl font-semibold tracking-tight md:text-[1.375rem]";

export const matchonPageDescClass =
  "text-matchon-text-secondary text-sm leading-relaxed md:text-[0.9375rem]";

export const matchonSectionTitleClass =
  "font-heading text-base font-semibold tracking-tight md:text-lg";

/** 모바일 가로 스크롤 탭/필터 pill row */
export const matchonScrollablePillsClass =
  "flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden";

export const matchonScrollablePillItemClass = "shrink-0 snap-start";
