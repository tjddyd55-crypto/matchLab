import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { resolveConsentFilterMatchonStatus } from "@/lib/ui/application-ui";
import { cn } from "@/lib/utils";

export function ConsentStatusBadge({
  label,
  filterKey,
  className,
}: {
  label: string;
  filterKey: string;
  className?: string;
}) {
  return (
    <MatchonStatusBadge
      status={resolveConsentFilterMatchonStatus(filterKey)}
      label={label}
      size="sm"
      className={cn("whitespace-nowrap", className)}
    />
  );
}
