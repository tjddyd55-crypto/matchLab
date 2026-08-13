import Link from "next/link";
import type { GymMemberListItemVM } from "@/lib/services/gym-member.service";
import { formatUtcDateOnly } from "@/lib/date-only";
import { formatWon } from "@/lib/format-won";
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
        "text-xs font-semibold",
        warn ? "text-amber-700" : "text-matchon-text-primary",
        member.membershipStatus === "expired" && "text-matchon-danger",
      )}
    >
      {member.endsAt ? formatUtcDateOnly(member.endsAt) : "—"}
    </span>
  );
}

function GroupCell({ names }: { names: string[] }) {
  if (names.length === 0) {
    return <span className="text-xs text-matchon-text-secondary">—</span>;
  }
  return (
    <span className="line-clamp-2 text-xs text-matchon-text-primary break-words">
      {names.join(", ")}
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
      <table className="w-full table-fixed text-left text-xs">
        <caption className="sr-only">회원 목록</caption>
        <thead className="border-b border-matchon-border bg-matchon-surface text-[10px] font-semibold text-matchon-text-secondary">
          <tr>
            <th scope="col" className="w-8 px-1.5 py-2 text-center">
              #
            </th>
            <th scope="col" className="w-[11%] px-1.5 py-2">
              회원명
            </th>
            <th scope="col" className="w-[10%] px-1.5 py-2">
              연락처
            </th>
            <th scope="col" className="w-[9%] px-1.5 py-2">
              그룹
            </th>
            <th scope="col" className="w-[8%] px-1.5 py-2">
              상태
            </th>
            <th scope="col" className="w-[12%] px-1.5 py-2">
              회원권
            </th>
            <th scope="col" className="w-[8%] px-1.5 py-2">
              이용시작일
            </th>
            <th scope="col" className="w-[8%] px-1.5 py-2">
              이용종료일
            </th>
            <th scope="col" className="w-[11%] px-1.5 py-2">
              이용기간/잔여
            </th>
            <th scope="col" className="w-[7%] px-1.5 py-2 text-right">
              출석횟수
            </th>
            <th scope="col" className="w-[8%] px-1.5 py-2 text-right">
              결제금액
            </th>
            <th scope="col" className="w-[8%] px-1.5 py-2">
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
              <td className="px-1.5 py-1 text-center text-[11px] tabular-nums text-matchon-text-secondary">
                {m.rowNumber}
              </td>
              <td className="px-1.5 py-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <GymMemberAvatar
                    src={m.profileImageUrl}
                    name={m.name}
                    className="size-6 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-1">
                      <span className="truncate text-xs font-semibold text-matchon-text-primary">
                        {m.name}
                      </span>
                      {m.isFighter ? (
                        <MemberStatusBadge label="선수" tone="fighter" />
                      ) : null}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap text-matchon-text-secondary">
                {formatPhoneNumber(m.phone)}
              </td>
              <td className="px-1.5 py-1">
                <GroupCell names={m.groupNames} />
              </td>
              <td className="px-1.5 py-1">
                <MemberStatusBadge
                  label={m.membershipStatusLabel}
                  tone={m.membershipStatus}
                />
              </td>
              <td className="px-1.5 py-1">
                <span className="line-clamp-2 break-words text-xs">
                  {m.planName ?? "회원권 없음"}
                </span>
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap text-matchon-text-secondary">
                {m.startedAt ? formatUtcDateOnly(m.startedAt) : "—"}
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap">
                <ExpirationCell member={m} />
              </td>
              <td className="px-1.5 py-1">
                <span className="line-clamp-2 text-xs text-matchon-text-primary">
                  {m.periodRemainingLabel ?? "—"}
                </span>
              </td>
              <td className="px-1.5 py-1 text-right tabular-nums text-matchon-text-primary">
                {m.attendanceCount == null ? "—" : `${m.attendanceCount}회`}
              </td>
              <td className="px-1.5 py-1 text-right tabular-nums text-matchon-text-primary">
                {m.paymentAmount == null ? "—" : formatWon(m.paymentAmount)}
              </td>
              <td className="px-1.5 py-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Link
                    href={`/gym/members/${m.id}`}
                    className="inline-flex min-h-7 items-center text-[11px] font-medium text-matchon-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matchon-primary/30"
                  >
                    상세
                  </Link>
                  <Link
                    href={`/gym/members/${m.id}/edit`}
                    className="inline-flex min-h-7 items-center text-[11px] text-matchon-text-secondary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matchon-primary/30"
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
