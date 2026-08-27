import type { ReactNode } from "react";
import {
  dashboardSidebarAsideCanvasClass,
  dashboardSidebarAsideClass,
  dashboardSidebarSpacerClass,
} from "@/lib/ui/dashboard-sidebar-ui";
import { cn } from "@/lib/utils";

export function SidebarShell({
  ariaLabel,
  className,
  canvasScroll = false,
  children,
}: {
  ariaLabel: string;
  className?: string;
  /** Desktop canvas scroll — fixed viewport sidebar 대신 in-flow sticky. */
  canvasScroll?: boolean;
  children: ReactNode;
}) {
  if (canvasScroll) {
    return (
      <aside
        className={cn(dashboardSidebarAsideCanvasClass, className)}
        aria-label={ariaLabel}
        data-dashboard-global-sidebar=""
      >
        {children}
      </aside>
    );
  }

  return (
    <>
      <div
        className={dashboardSidebarSpacerClass}
        aria-hidden="true"
        data-dashboard-global-sidebar-spacer=""
      />
      <aside
        className={cn(dashboardSidebarAsideClass, className)}
        aria-label={ariaLabel}
        data-dashboard-global-sidebar=""
      >
        {children}
      </aside>
    </>
  );
}
