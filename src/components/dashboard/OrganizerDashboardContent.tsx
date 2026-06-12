import type { ReactNode } from "react";
import {
  ORGANIZER_DASHBOARD_CONTAINER_CLASS,
  ORGANIZER_DASHBOARD_PAGE_CLASS,
} from "@/lib/organizer-dashboard-layout";
import { cn } from "@/lib/utils";

export function OrganizerDashboardContent({
  children,
  className,
  pageClassName,
}: {
  children: ReactNode;
  className?: string;
  pageClassName?: string;
}) {
  return (
    <div className={cn(ORGANIZER_DASHBOARD_CONTAINER_CLASS, className)}>
      <div className={cn(ORGANIZER_DASHBOARD_PAGE_CLASS, pageClassName)}>
        {children}
      </div>
    </div>
  );
}
