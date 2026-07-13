import {
  matchonPageDescClass,
  matchonSectionStackClass,
} from "@/lib/ui/matchon-layout";
import {
  matchonFilterPillActiveClass,
  matchonFilterPillBaseClass,
  matchonFilterPillInactiveClass,
  matchonUnderlineTabActiveClass,
  matchonUnderlineTabBaseClass,
  matchonUnderlineTabInactiveClass,
  matchonUnderlineTabsNavClass,
} from "@/lib/ui/matchon-shell-ui";

export const eventManagementContentClass =
  "min-w-0 w-full space-y-6 pt-4 md:space-y-8 md:pt-6";

export const eventManagementPageHeaderClass = "space-y-1";

export const eventManagementPageTitleClass =
  "font-heading text-2xl font-bold tracking-tight text-matchon-text-primary md:text-[28px]";

export const eventManagementPageDescClass = matchonPageDescClass;

export const eventManagementChromeClass =
  "mb-4 min-w-0 space-y-0 border-b border-matchon-border bg-white md:mb-6";

export const eventManagementContextHeaderClass =
  "flex min-w-0 flex-col gap-2 px-0 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 md:py-4";

export const eventManagementPrimaryNavClass =
  "flex h-11 min-w-0 items-stretch gap-1 overflow-x-auto border-b border-matchon-border bg-white [-ms-overflow-style:none] [scrollbar-width:none] md:h-12 [&::-webkit-scrollbar]:hidden";

export const eventManagementPrimaryNavLinkBaseClass =
  "inline-flex h-full shrink-0 items-center border-b-2 border-transparent px-4 text-sm font-semibold transition-colors";

export const eventManagementPrimaryNavLinkActiveClass =
  matchonUnderlineTabActiveClass;

export const eventManagementPrimaryNavLinkInactiveClass =
  matchonUnderlineTabInactiveClass;

export const eventManagementSecondaryNavClass =
  "flex min-w-0 gap-2 overflow-x-auto bg-matchon-surface/40 px-0 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export const eventManagementSecondaryNavLinkBaseClass =
  `${matchonFilterPillBaseClass} min-h-8 px-3 py-1 text-xs font-medium md:text-sm`;

export const eventManagementSecondaryNavLinkActiveClass =
  matchonFilterPillActiveClass;

export const eventManagementSecondaryNavLinkInactiveClass =
  matchonFilterPillInactiveClass;

export {
  matchonSectionStackClass,
  matchonUnderlineTabsNavClass,
  matchonUnderlineTabBaseClass,
  matchonUnderlineTabActiveClass,
  matchonUnderlineTabInactiveClass,
};

