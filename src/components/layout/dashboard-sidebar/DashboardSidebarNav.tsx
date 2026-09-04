"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { scheduleEffectStateUpdate } from "@/lib/react/schedule-effect-state-update";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { DashboardSidebarNavGroup } from "@/lib/navigation/dashboard-sidebar";
import {
  dashboardSidebarAccordionChevronClass,
  dashboardSidebarAccordionTriggerClass,
  dashboardSidebarAccordionTriggerOpenClass,
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

function groupContainsActivePath(
  group: DashboardSidebarNavGroup,
  pathname: string,
  isItemActive: (href: string, pathname: string) => boolean,
): boolean {
  if (group.items.some((item) => isItemActive(item.href, pathname))) {
    return true;
  }
  return (group.branches ?? []).some((branch) =>
    branch.items.some((item) => isItemActive(item.href, pathname)),
  );
}

function resolveOpenGroupId(
  groups: DashboardSidebarNavGroup[],
  pathname: string,
  isItemActive: (href: string, pathname: string) => boolean,
): string | null {
  const labeled = groups.filter((g) => g.label != null);
  const active = labeled.find((g) =>
    groupContainsActivePath(g, pathname, isItemActive),
  );
  return active?.id ?? labeled[0]?.id ?? null;
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

function SidebarAccordionSection({
  id,
  label,
  open,
  onToggle,
  isFirstSection,
  children,
}: {
  id: string;
  label: string;
  open: boolean;
  onToggle: () => void;
  isFirstSection: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={
        isFirstSection
          ? dashboardSidebarFirstSectionClass
          : dashboardSidebarSectionClass
      }
      data-nav-group={id}
      data-nav-accordion={open ? "open" : "closed"}
    >
      <button
        type="button"
        data-nav-level="section"
        data-nav-section={label}
        aria-expanded={open}
        onClick={onToggle}
        className={cn(
          dashboardSidebarAccordionTriggerClass,
          open && dashboardSidebarAccordionTriggerOpenClass,
        )}
      >
        <span className="min-w-0 truncate">{label}</span>
        <span
          className={cn(
            dashboardSidebarAccordionChevronClass,
            open && "rotate-90",
          )}
          aria-hidden="true"
        >
          ›
        </span>
      </button>
      {open ? children : null}
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
  const accordion = density === "desktop";
  const groupKey = groups.map((g) => g.id).join("|");
  const [openGroupId, setOpenGroupId] = useState<string | null>(() =>
    accordion
      ? resolveOpenGroupId(groups, pathname, isItemActive)
      : null,
  );

  useEffect(() => {
    if (!accordion) return;
    scheduleEffectStateUpdate(() => {
      setOpenGroupId(resolveOpenGroupId(groups, pathname, isItemActive));
    });
    // groups 참조는 렌더마다 바뀌므로 id 키 + pathname만 동기화한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [accordion, pathname, groupKey]);

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

        const children = (
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
        );

        if (!accordion) {
          return (
            <SidebarSection
              key={group.id}
              id={group.id}
              label={group.label}
              isFirstSection={groupIndex === labeledIndex}
            >
              {children}
            </SidebarSection>
          );
        }

        const open = openGroupId === group.id;
        return (
          <SidebarAccordionSection
            key={group.id}
            id={group.id}
            label={group.label}
            open={open}
            isFirstSection={groupIndex === labeledIndex}
            onToggle={() =>
              setOpenGroupId((prev) => (prev === group.id ? null : group.id))
            }
          >
            {children}
          </SidebarAccordionSection>
        );
      })}
    </nav>
  );
}
