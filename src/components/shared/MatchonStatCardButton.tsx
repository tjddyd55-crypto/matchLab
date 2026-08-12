"use client";

import {
  eventManagementStatCardClass,
  eventManagementStatCardInteractiveClass,
  eventManagementStatCardRelaxedClass,
  eventManagementStatCardSelectedClass,
  eventManagementStatLabelClass,
  eventManagementStatLabelRelaxedClass,
  eventManagementStatLabelRelaxedSelectedClass,
  eventManagementStatLabelSelectedClass,
  eventManagementStatValueClass,
  eventManagementStatValueRelaxedClass,
} from "@/lib/ui/event-management-ui";
import { cn } from "@/lib/utils";

export function MatchonStatCardButton({
  label,
  value,
  hint,
  active,
  onClick,
  className,
  density = "compact",
}: {
  label: string;
  value: string | number;
  hint?: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  density?: "compact" | "relaxed";
}) {
  const Tag = onClick ? "button" : "div";
  const compact = density === "compact";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      aria-pressed={onClick ? active : undefined}
      title={hint}
      onClick={onClick}
      className={cn(
        compact
          ? eventManagementStatCardClass
          : eventManagementStatCardRelaxedClass,
        onClick && eventManagementStatCardInteractiveClass,
        "w-full",
        active && eventManagementStatCardSelectedClass,
        className,
      )}
    >
      <p
        className={cn(
          compact
            ? eventManagementStatLabelClass
            : eventManagementStatLabelRelaxedClass,
          active &&
            (compact
              ? eventManagementStatLabelSelectedClass
              : eventManagementStatLabelRelaxedSelectedClass),
        )}
      >
        {label}
      </p>
      <p
        className={
          compact
            ? eventManagementStatValueClass
            : eventManagementStatValueRelaxedClass
        }
      >
        {value}
      </p>
      {hint && !compact ? (
        <p
          className={cn(
            eventManagementStatLabelRelaxedClass,
            "mt-1 text-[11px]",
          )}
        >
          {hint}
        </p>
      ) : null}
    </Tag>
  );
}
