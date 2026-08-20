import type { ReactNode } from "react";
import {
  dashboardSidebarAsideClass,
  dashboardSidebarSpacerClass,
} from "@/lib/ui/dashboard-sidebar-ui";
import { cn } from "@/lib/utils";

export function SidebarShell({
  ariaLabel,
  className,
  children,
}: {
  ariaLabel: string;
  className?: string;
  children: ReactNode;
}) {
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
