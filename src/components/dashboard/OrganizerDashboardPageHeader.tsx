import type { ReactNode } from "react";
import {
  ORGANIZER_DASHBOARD_DESC_CLASS,
  ORGANIZER_DASHBOARD_HEADER_CLASS,
  ORGANIZER_DASHBOARD_TITLE_CLASS,
  ORGANIZER_PAGE_EYEBROW_CLASS,
} from "@/lib/organizer-dashboard-layout";
import { cn } from "@/lib/utils";

export function OrganizerDashboardPageHeader({
  title,
  description,
  eyebrow,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  eyebrow?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        ORGANIZER_DASHBOARD_HEADER_CLASS,
        className,
      )}
    >
      <div className="space-y-1">
        {eyebrow ? (
          <p className={ORGANIZER_PAGE_EYEBROW_CLASS}>{eyebrow}</p>
        ) : null}
        <h1 className={ORGANIZER_DASHBOARD_TITLE_CLASS}>{title}</h1>
        {description ? (
          <div className={ORGANIZER_DASHBOARD_DESC_CLASS}>{description}</div>
        ) : null}
      </div>
      {children}
    </header>
  );
}
