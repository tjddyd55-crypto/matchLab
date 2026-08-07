import Link from "next/link";
import type { GymMemberListItemVM } from "@/lib/services/gym-member.service";
import { formatPhoneNumber } from "@/lib/phone";
import { GymMemberAvatar } from "@/components/domain/gym-members/GymMemberAvatar";
import { MemberStatusBadge } from "@/components/domain/gym-members/MemberStatusBadge";
import { cn } from "@/lib/utils";

export function MemberMobileCard({
  member,
}: {
  member: GymMemberListItemVM;
}) {
  return (
    <Link
      href={`/gym/members/${member.id}`}
      className={cn(
        "block min-h-[88px] rounded-xl border border-matchon-border bg-white p-3",
        "transition-colors hover:border-matchon-primary/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matchon-primary/30",
      )}
    >
      <div className="flex items-start gap-3">
        <GymMemberAvatar
          src={member.profileImageUrl}
          name={member.name}
          className="size-9"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-semibold text-matchon-text-primary">
              {member.name}
            </p>
            <MemberStatusBadge
              label={member.membershipStatusLabel}
              tone={member.membershipStatus}
            />
          </div>
          <p className="mt-0.5 text-xs text-matchon-text-secondary">
            {formatPhoneNumber(member.phone)}
          </p>
          <p className="mt-1 truncate text-xs text-matchon-text-secondary">
            {member.planName ?? "회원권 없음"}
            {" · "}
            {member.expirationDisplay}
          </p>
        </div>
      </div>
    </Link>
  );
}
