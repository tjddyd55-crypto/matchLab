import type { ReactNode } from "react";
import { dashboardSidebarAsideClass } from "@/lib/ui/dashboard-sidebar-ui";
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
    <aside
      className={cn(dashboardSidebarAsideClass, className)}
      aria-label={ariaLabel}
    >
      {children}
    </aside>
  );
}
