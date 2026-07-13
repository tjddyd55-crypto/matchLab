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
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  /** @deprecated EventContextHeader에서 대회명을 표시합니다. */
  eventTitle?: string | null;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn(EVENT_MANAGEMENT_PAGE_HEADER_CLASS, className)}>
      <h1 className={EVENT_MANAGEMENT_PAGE_TITLE_CLASS}>{title}</h1>
      {description ? (
        <div className={EVENT_MANAGEMENT_PAGE_DESC_CLASS}>{description}</div>
      ) : null}
      {children}
    </header>
  );
}
