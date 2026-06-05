import { StatusBadge } from "@/components/shared/StatusBadge";
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
  const variant =
    filterKey === "completed" || filterKey === "not_required"
      ? "default"
      : filterKey === "missing"
        ? "destructive"
        : "secondary";

  return (
    <StatusBadge
      variant={variant}
      label={label}
      className={cn("whitespace-nowrap", className)}
    />
  );
}
