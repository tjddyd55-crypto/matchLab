import Link from "next/link";
import type { GymMemberListItemVM } from "@/lib/services/gym-member.service";
import { formatPhoneNumber } from "@/lib/phone";
import { GymMemberAvatar } from "@/components/domain/gym-members/GymMemberAvatar";
import { MemberStatusBadge } from "@/components/domain/gym-members/MemberStatusBadge";
import { cn } from "@/lib/utils";

function ExpirationCell({ member }: { member: GymMemberListItemVM }) {
  const warn =
    member.membershipStatus === "expiring" ||
    member.membershipStatus === "expired";
  return (
    <span
      className={cn(
        "text-sm font-semibold",
        warn ? "text-amber-700" : "text-matchon-text-primary",
        member.membershipStatus === "expired" && "text-matchon-danger",
      )}
    >
      {member.expirationDisplay}
    </span>
  );
}

export function MemberTable({
  members,
}: {
  members: GymMemberListItemVM[];
}) {
  return (
    <div className="hidden overflow-hidden rounded-[10px] border border-matchon-border bg-white lg:block">
      <table className="w-full table-fixed text-left text-sm">
        <caption className="sr-only">회원 목록</caption>
        <thead className="border-b border-matchon-border bg-matchon-surface text-[11px] font-semibold text-matchon-text-secondary">
          <tr>
            <th scope="col" className="w-[22%] px-4 py-2.5">
              회원
            </th>
            <th scope="col" className="w-[16%] px-3 py-2.5">
              연락처
            </th>
            <th scope="col" className="w-[12%] px-3 py-2.5">
              상태
            </th>
            <th scope="col" className="w-[20%] px-3 py-2.5">
              회원권
            </th>
            <th scope="col" className="w-[12%] px-3 py-2.5">
              만료
            </th>
            <th scope="col" className="w-[18%] px-3 py-2.5">
              관리
            </th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr
              key={m.id}
              className="border-b border-matchon-border last:border-0 hover:bg-matchon-surface/60"
            >
              <td className="px-4 py-1.5">
                <div className="flex min-w-0 items-center gap-2">
                  <GymMemberAvatar
                    src={m.profileImageUrl}
                    name={m.name}
                    className="size-7"
                  />
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate font-semibold text-matchon-text-primary">
                        {m.name}
                      </span>
                      {m.isFighter ? (
                        <MemberStatusBadge label="선수" tone="fighter" />
                      ) : null}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-3 py-1.5 whitespace-nowrap text-matchon-text-secondary">
                {formatPhoneNumber(m.phone)}
              </td>
              <td className="px-3 py-1.5">
                <MemberStatusBadge
                  label={m.membershipStatusLabel}
                  tone={m.membershipStatus}
                />
              </td>
              <td className="px-3 py-1.5">
                <span className="line-clamp-2 break-words">
                  {m.planName ?? "회원권 없음"}
                </span>
              </td>
              <td className="px-3 py-1.5 whitespace-nowrap">
                <ExpirationCell member={m} />
              </td>
              <td className="px-3 py-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/gym/members/${m.id}`}
                    className="inline-flex min-h-9 items-center text-xs font-medium text-matchon-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matchon-primary/30"
                  >
                    상세
                  </Link>
                  <Link
                    href={`/gym/members/${m.id}/edit`}
                    className="inline-flex min-h-9 items-center text-xs text-matchon-text-secondary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matchon-primary/30"
                  >
                    수정
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
