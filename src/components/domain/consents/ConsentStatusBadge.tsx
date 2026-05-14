import type { GymConsentUiKind } from "@/lib/services/registration.service";
import { cn } from "@/lib/utils";

const STYLE: Record<GymConsentUiKind, string> = {
  not_required: "bg-muted text-muted-foreground",
  required_no_consent_row: "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100",
  draft: "bg-sky-100 text-sky-950 dark:bg-sky-950/40 dark:text-sky-100",
  completed: "bg-emerald-100 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100",
};

export function ConsentStatusBadge({
  label,
  kind,
}: {
  label: string;
  kind: GymConsentUiKind;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STYLE[kind],
      )}
    >
      {label}
    </span>
  );
}
