import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
  matchonSectionStackClass,
} from "@/lib/ui/matchon-layout";

/** 주최자 dashboard 큰 메뉴 페이지 공통 container (organizer 전용) */

export const ORGANIZER_DASHBOARD_CONTAINER_CLASS = matchonPageContainerClass;

export const ORGANIZER_DASHBOARD_PAGE_CLASS = matchonPageStackClass;

export const ORGANIZER_DASHBOARD_HEADER_CLASS = "space-y-1";

export const ORGANIZER_DASHBOARD_TITLE_CLASS = matchonPageTitleClass;

export const ORGANIZER_DASHBOARD_DESC_CLASS = matchonPageDescClass;

export const ORGANIZER_DASHBOARD_SECTION_CLASS = matchonSectionStackClass;
