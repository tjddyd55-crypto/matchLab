import {
  matchonSecondarySidebarClass,
  matchonSecondarySidebarLinkActiveClass,
  matchonSecondarySidebarLinkBaseClass,
  matchonSecondarySidebarLinkInactiveClass,
  matchonSecondarySidebarSectionLabelClass,
} from "@/lib/ui/matchon-shell-ui";
import {
  matchonPageDescClass,
  matchonSectionStackClass,
} from "@/lib/ui/matchon-layout";

export const eventManagementContentClass = matchonSectionStackClass;

export const eventManagementPageHeaderClass = "space-y-1";

export const eventManagementPageTitleClass =
  "font-heading text-2xl font-bold tracking-tight text-matchon-text-primary md:text-[28px]";

export const eventManagementPageDescClass = matchonPageDescClass;

export {
  matchonSecondarySidebarClass as eventManagementSidebarClass,
  matchonSecondarySidebarSectionLabelClass as eventManagementSidebarSectionLabelClass,
  matchonSecondarySidebarLinkBaseClass as eventManagementSidebarLinkBaseClass,
  matchonSecondarySidebarLinkActiveClass as eventManagementSidebarLinkActiveClass,
  matchonSecondarySidebarLinkInactiveClass as eventManagementSidebarLinkInactiveClass,
};
