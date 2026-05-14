import type { ApplicationStatus } from "@/generated/prisma";
import { StatusBadge } from "@/components/shared/StatusBadge";

const LABELS: Record<ApplicationStatus, string> = {
  pending: "대기",
  approved: "승인",
  rejected: "반려",
  cancelled: "취소",
};

export function ApplicationStatusBadge({
  status,
}: {
  status: ApplicationStatus;
}) {
  const label = LABELS[status];
  const variant =
    status === "approved"
      ? "default"
      : status === "rejected"
        ? "destructive"
        : status === "cancelled"
          ? "outline"
          : "secondary";
  return <StatusBadge variant={variant} label={label} />;
}
