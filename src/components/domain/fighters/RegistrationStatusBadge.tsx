import {
  FighterRegistrationSubmissionStatus,
} from "@/lib/enums";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

const LABELS: Record<FighterRegistrationSubmissionStatus, string> = {
  submitted: "접수됨",
  duplicate_review: "중복 검토",
  approved: "승인됨",
  rejected: "반려",
};

const VARIANT: Partial<
  Record<
    FighterRegistrationSubmissionStatus,
    "default" | "secondary" | "outline" | "destructive"
  >
> = {
  submitted: "outline",
  duplicate_review: "destructive",
  approved: "secondary",
  rejected: "outline",
};

export function RegistrationStatusBadge({
  status,
  className,
}: {
  status: FighterRegistrationSubmissionStatus;
  className?: string;
}) {
  return (
    <StatusBadge
      variant={VARIANT[status] ?? "secondary"}
      label={LABELS[status]}
      className={cn("font-normal", className)}
    />
  );
}
