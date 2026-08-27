"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { DashboardSidebarNavGroup } from "@/lib/navigation/dashboard-sidebar";
import {
  dashboardSidebarDividerClass,
  dashboardSidebarFirstSectionClass,
  dashboardSidebarHomeWrapClass,
  dashboardSidebarItemActiveClass,
  dashboardSidebarItemBaseClass,
  dashboardSidebarItemDesktopClass,
  dashboardSidebarItemInactiveClass,
  dashboardSidebarItemTouchClass,
  dashboardSidebarNavClass,
  dashboardSidebarSectionBulletClass,
  dashboardSidebarSectionClass,
  dashboardSidebarSectionItemsClass,
  dashboardSidebarSectionLabelClass,
} from "@/lib/ui/dashboard-sidebar-ui";
import { cn } from "@/lib/utils";

export type DashboardSidebarDensity = "desktop" | "touch";

function itemHeightClass(density: DashboardSidebarDensity): string {
  return density === "touch"
    ? dashboardSidebarItemTouchClass
    : dashboardSidebarItemDesktopClass;
}

export function SidebarNavItem({
  href,
  label,
  active,
  density,
  level,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  density: DashboardSidebarDensity;
  level: "root" | "item";
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      data-nav-level={level}
      data-nav-item={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        dashboardSidebarItemBaseClass,
        itemHeightClass(density),
        active
          ? dashboardSidebarItemActiveClass
          : dashboardSidebarItemInactiveClass,
      )}
    >
      <span className="min-w-0 truncate">{label}</span>
    </Link>
  );
}

export function SidebarHomeItem({
  href,
  label,
  active,
  density,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  density: DashboardSidebarDensity;
  onNavigate?: () => void;
}) {
  return (
    <SidebarNavItem
      href={href}
      label={label}
      active={active}
      density={density}
      level="root"
      onNavigate={onNavigate}
    />
  );
}

export function SidebarDivider() {
  return <div className={dashboardSidebarDividerClass} aria-hidden="true" />;
}

export function SidebarSectionLabel({ label }: { label: string }) {
  return (
    <div
      data-nav-level="section"
      data-nav-section={label}
      className={dashboardSidebarSectionLabelClass}
    >
      <span className={dashboardSidebarSectionBulletClass} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function SidebarSectionItems({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ul className={dashboardSidebarSectionItemsClass} data-nav-children="">
      {children}
    </ul>
  );
}

export function SidebarSection({
  id,
  label,
  children,
  isFirstSection,
}: {
  id: string;
  label: string;
  children: ReactNode;
  isFirstSection: boolean;
}) {
  return (
    <div
      className={
        isFirstSection
          ? dashboardSidebarFirstSectionClass
          : dashboardSidebarSectionClass
      }
      data-nav-group={id}
    >
      <SidebarSectionLabel label={label} />
      {children}
    </div>
  );
}

function SidebarNestedBranch({
  branchId,
  label,
  items,
  isItemActive,
  density,
  onNavigate,
  pathname,
}: {
  branchId: string;
  label: string;
  items: { href: string; label: string }[];
  isItemActive: (href: string, pathname: string) => boolean;
  density: DashboardSidebarDensity;
  onNavigate?: () => void;
  pathname: string;
}) {
  const branchActive = items.some((item) => isItemActive(item.href, pathname));

  return (
    <li
      data-nav-branch={branchId}
      data-nav-branch-open={branchActive ? "true" : "false"}
    >
      <div
        className={cn(
          "flex items-center px-3 text-[12px] font-semibold",
          itemHeightClass(density),
          branchActive ? "text-white" : "text-slate-400",
        )}
        title={label}
      >
        <span className="min-w-0 truncate">{label}</span>
      </div>
      <ul className="mb-1 ml-2 space-y-0.5 border-l border-white/10 pl-2">
        {items.map((item) => (
          <li key={`${branchId}-${item.href}`}>
            <SidebarNavItem
              href={item.href}
              label={item.label}
              active={isItemActive(item.href, pathname)}
              density={density}
              level="item"
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ul>
    </li>
  );
}

export function DashboardSidebarNav({
  groups,
  isItemActive,
  density = "desktop",
  ariaLabel,
  onNavigate,
  dataOrganizerGlobalNav,
}: {
  groups: DashboardSidebarNavGroup[];
  isItemActive: (href: string, pathname: string) => boolean;
  density?: DashboardSidebarDensity;
  ariaLabel: string;
  onNavigate?: () => void;
  dataOrganizerGlobalNav?: boolean;
}) {
  const pathname = usePathname() ?? "";
  const labeledIndex = groups.findIndex((g) => g.label != null);

  return (
    <nav
      className={dashboardSidebarNavClass}
      aria-label={ariaLabel}
      {...(dataOrganizerGlobalNav ? { "data-organizer-global-nav": "" } : {})}
    >
      {groups.map((group, groupIndex) => {
        if (group.label == null) {
          return (
            <div key={group.id} data-nav-group={group.id}>
              <ul className={dashboardSidebarHomeWrapClass}>
                {group.items.map((item) => (
                  <li key={`${group.id}-${item.href}`}>
                    <SidebarHomeItem
                      href={item.href}
                      label={item.label}
                      active={isItemActive(item.href, pathname)}
                      density={density}
                      onNavigate={onNavigate}
                    />
                  </li>
                ))}
              </ul>
              <SidebarDivider />
            </div>
          );
        }

        return (
          <SidebarSection
            key={group.id}
            id={group.id}
            label={group.label}
            isFirstSection={groupIndex === labeledIndex}
          >
            <SidebarSectionItems>
              {group.items.map((item) => (
                <li key={`${group.id}-${item.href}`}>
                  <SidebarNavItem
                    href={item.href}
                    label={item.label}
                    active={isItemActive(item.href, pathname)}
                    density={density}
                    level="item"
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
              {(group.branches ?? []).map((branch) => (
                <SidebarNestedBranch
                  key={`${group.id}-${branch.id}`}
                  branchId={branch.id}
                  label={branch.label}
                  items={branch.items}
                  isItemActive={isItemActive}
                  density={density}
                  onNavigate={onNavigate}
                  pathname={pathname}
                />
              ))}
            </SidebarSectionItems>
          </SidebarSection>
        );
      })}
    </nav>
  );
}
