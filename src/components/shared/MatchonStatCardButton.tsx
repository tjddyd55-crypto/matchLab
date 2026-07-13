"use client";

import {
  eventManagementStatCardClass,
  eventManagementStatCardInteractiveClass,
  eventManagementStatCardSelectedClass,
  eventManagementStatLabelClass,
  eventManagementStatLabelSelectedClass,
  eventManagementStatValueClass,
} from "@/lib/ui/event-management-ui";
import { cn } from "@/lib/utils";

export function MatchonStatCardButton({
  label,
  value,
  hint,
  active,
  onClick,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      aria-pressed={onClick ? active : undefined}
      onClick={onClick}
      className={cn(
        eventManagementStatCardClass,
        onClick && eventManagementStatCardInteractiveClass,
        "w-full",
        active && eventManagementStatCardSelectedClass,
        className,
      )}
    >
      <p
        className={cn(
          eventManagementStatLabelClass,
          active && eventManagementStatLabelSelectedClass,
        )}
      >
        {label}
      </p>
      <p className={eventManagementStatValueClass}>{value}</p>
      {hint ? (
        <p className={cn(eventManagementStatLabelClass, "mt-1 text-[11px]")}>
          {hint}
        </p>
      ) : null}
    </Tag>
  );
}
