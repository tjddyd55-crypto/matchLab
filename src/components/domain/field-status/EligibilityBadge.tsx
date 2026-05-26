import { StatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

export function EligibilityBadge({
  label,
  isEligible,
  title,
}: {
  label: string;
  isEligible: boolean;
  title?: string;
}) {
  return (
    <StatusBadge
      variant={isEligible ? "default" : "outline"}
      className={cn(
        !isEligible && "border-amber-500/60 text-amber-950 dark:text-amber-100",
      )}
      label={
        <span title={title}>{isEligible ? label : `⚠ ${label}`}</span>
      }
    />
  );
}
