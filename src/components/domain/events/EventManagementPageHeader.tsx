import type { ReactNode } from "react";
import {
  EVENT_MANAGEMENT_PAGE_DESC_CLASS,
  EVENT_MANAGEMENT_PAGE_HEADER_CLASS,
  EVENT_MANAGEMENT_PAGE_TITLE_CLASS,
} from "@/lib/event-management-layout";
import { cn } from "@/lib/utils";

export function EventManagementPageHeader({
  title,
  description,
  eventTitle,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  eventTitle?: string | null;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn(EVENT_MANAGEMENT_PAGE_HEADER_CLASS, className)}>
      <h1 className={EVENT_MANAGEMENT_PAGE_TITLE_CLASS}>{title}</h1>
      {eventTitle ? (
        <p className="text-muted-foreground text-sm">{eventTitle}</p>
      ) : null}
      {description ? (
        <div className={EVENT_MANAGEMENT_PAGE_DESC_CLASS}>{description}</div>
      ) : null}
      {children}
    </header>
  );
}
