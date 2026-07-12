import {
  matchonPageDescClass,
  matchonSectionStackClass,
} from "@/lib/ui/matchon-layout";

/** 주최자 대회 관리 하위 페이지 — 상위 organizer layout이 container를 제공 */

export const EVENT_MANAGEMENT_CONTENT_CLASS = matchonSectionStackClass;

export const EVENT_MANAGEMENT_PAGE_HEADER_CLASS = "space-y-1";

export const EVENT_MANAGEMENT_PAGE_TITLE_CLASS =
  "font-heading text-2xl font-semibold tracking-tight";

export const EVENT_MANAGEMENT_PAGE_DESC_CLASS = matchonPageDescClass;
