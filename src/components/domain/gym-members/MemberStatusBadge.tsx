import type { GymMemberMembershipDisplayStatus } from "@/lib/gym-member-membership-status";
import { cn } from "@/lib/utils";

const TONE_CLASS: Record<
  GymMemberMembershipDisplayStatus | "fighter" | "neutral",
  string
> = {
  active: "bg-emerald-50 text-matchon-success",
  expiring: "bg-amber-50 text-amber-700",
  expired: "bg-red-50 text-matchon-danger",
  paused: "bg-amber-50 text-amber-700",
  withdrawn: "bg-slate-100 text-matchon-text-secondary",
  no_plan: "bg-slate-100 text-matchon-text-secondary",
  fighter: "bg-matchon-primary-dark text-white",
  neutral: "bg-slate-100 text-matchon-text-secondary",
};

export function MemberStatusBadge({
  label,
  tone,
  className,
}: {
  label: string;
  tone: GymMemberMembershipDisplayStatus | "fighter" | "neutral";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full truncate rounded-md px-2 py-0.5 text-[11px] font-medium",
        TONE_CLASS[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
