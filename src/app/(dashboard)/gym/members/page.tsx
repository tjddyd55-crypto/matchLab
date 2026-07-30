import Link from "next/link";
import { requireActor } from "@/lib/auth/actor";
import { GymMemberStatus } from "@/lib/enums";
import { formatPhoneNumber } from "@/lib/phone";
import { formatUtcDateOnly } from "@/lib/date-only";
import { gymMemberService } from "@/lib/services/gym-member.service";
import { getGymMemberStoredStatusLabel } from "@/lib/gym-member-membership-status";
import { GymMemberAvatar } from "@/components/domain/gym-members/GymMemberAvatar";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { MatchonEmptyState } from "@/components/shared/MatchonEmptyState";
import { buttonVariants } from "@/components/ui/button";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";
import {
  matchonCompactActionBarClass,
  matchonCompactTableWrapClass,
  matchonFieldInputClass,
  matchonFilterBarClass,
  matchonMobileCardListClass,
  matchonStatCardClass,
  matchonStatLabelClass,
  matchonStatValueClass,
  matchonStatsGridClass,
} from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Search = {
  q?: string;
  status?: string;
  fighter?: string;
  expiration?: string;
  page?: string;
};

function parseStatus(raw?: string): GymMemberStatus | undefined {
  if (
    raw === GymMemberStatus.active ||
    raw === GymMemberStatus.paused ||
    raw === GymMemberStatus.withdrawn
  ) {
    return raw;
  }
  return undefined;
}

function parseFighter(
  raw?: string,
): "all" | "fighter" | "non_fighter" | undefined {
  if (raw === "fighter" || raw === "non_fighter" || raw === "all") return raw;
  return undefined;
}

function parseExpiration(
  raw?: string,
): "all" | "active" | "expiring" | "expired" | "no_plan" | undefined {
  if (
    raw === "active" ||
    raw === "expiring" ||
    raw === "expired" ||
    raw === "no_plan" ||
    raw === "all"
  ) {
    return raw;
  }
  return undefined;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && v !== "all" && v !== "") sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export default async function GymMembersPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const actor = await requireActor();
  const sp = await searchParams;

  if (!actor.gymId) {
    return (
      <div className={matchonPageContainerClass}>
        <div className={matchonPageStackClass}>
          <GymProfileMissingBanner />
        </div>
      </div>
    );
  }

  const q = sp.q?.trim() || undefined;
  const status = parseStatus(sp.status);
  const fighterFilter = parseFighter(sp.fighter) ?? "all";
  const expirationFilter = parseExpiration(sp.expiration) ?? "all";
  const page = Math.max(1, Number(sp.page) || 1);

  const [summary, list] = await Promise.all([
    gymMemberService.getSummary(actor),
    gymMemberService.listMembers(actor, {
      q,
      status,
      fighterFilter,
      expirationFilter,
      page,
      pageSize: 30,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));
  const baseParams = {
    q,
    status: status ?? undefined,
    fighter: fighterFilter === "all" ? undefined : fighterFilter,
    expiration: expirationFilter === "all" ? undefined : expirationFilter,
  };

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <div className="min-w-0 space-y-1">
          <h1 className={matchonPageTitleClass}>전체 회원</h1>
          <p className={matchonPageDescClass}>
            체육관 회원을 등록·검색하고 이용권·선수 연결을 관리합니다.
          </p>
        </div>

        <div className={matchonStatsGridClass}>
          <div className={matchonStatCardClass}>
            <p className={matchonStatLabelClass}>전체</p>
            <p className={matchonStatValueClass}>{summary.total}</p>
          </div>
          <div className={matchonStatCardClass}>
            <p className={matchonStatLabelClass}>일반</p>
            <p className={matchonStatValueClass}>{summary.withoutFighter}</p>
          </div>
          <div className={matchonStatCardClass}>
            <p className={matchonStatLabelClass}>선수</p>
            <p className={matchonStatValueClass}>{summary.withFighter}</p>
          </div>
          <div className={matchonStatCardClass}>
            <p className={matchonStatLabelClass}>이용 중</p>
            <p className={matchonStatValueClass}>{summary.inUse}</p>
          </div>
          <div className={matchonStatCardClass}>
            <p className={matchonStatLabelClass}>만료 예정</p>
            <p className={matchonStatValueClass}>{summary.expiring}</p>
          </div>
          <div className={matchonStatCardClass}>
            <p className={matchonStatLabelClass}>이번 달 신규</p>
            <p className={matchonStatValueClass}>{summary.newThisMonth}</p>
          </div>
        </div>

        <div className={matchonCompactActionBarClass}>
          <Link
            href="/gym/members/new"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            회원 등록
          </Link>
          <Link
            href="/gym/membership-plans"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            이용권 관리
          </Link>
        </div>

        <form method="get" className={cn(matchonFilterBarClass, "space-y-3")}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">검색</span>
              <input
                name="q"
                defaultValue={q ?? ""}
                placeholder="이름, 연락처, 회원번호"
                className={matchonFieldInputClass}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">상태</span>
              <select
                name="status"
                defaultValue={status ?? ""}
                className={matchonFieldInputClass}
              >
                <option value="">전체</option>
                <option value={GymMemberStatus.active}>이용 중</option>
                <option value={GymMemberStatus.paused}>휴회</option>
                <option value={GymMemberStatus.withdrawn}>퇴회</option>
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">선수</span>
              <select
                name="fighter"
                defaultValue={fighterFilter}
                className={matchonFieldInputClass}
              >
                <option value="all">전체</option>
                <option value="non_fighter">일반</option>
                <option value="fighter">선수</option>
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">만료</span>
              <select
                name="expiration"
                defaultValue={expirationFilter}
                className={matchonFieldInputClass}
              >
                <option value="all">전체</option>
                <option value="active">이용 중</option>
                <option value="expiring">만료 예정</option>
                <option value="expired">만료</option>
                <option value="no_plan">이용권 없음</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={cn(buttonVariants({ size: "sm" }))}>
              필터 적용
            </button>
            <Link
              href="/gym/members"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              초기화
            </Link>
          </div>
        </form>

        {list.items.length === 0 ? (
          <MatchonEmptyState
            title="회원이 없습니다"
            description="회원을 등록하면 이용권·선수 연결을 함께 관리할 수 있습니다."
            action={
              <Link
                href="/gym/members/new"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                회원 등록
              </Link>
            }
          />
        ) : (
          <>
            <p className="text-sm text-matchon-text-secondary">
              총 {list.total}명 · {list.page}/{totalPages} 페이지
            </p>

            <div className={matchonMobileCardListClass}>
              {list.items.map((m) => (
                <Link
                  key={m.id}
                  href={`/gym/members/${m.id}`}
                  className="block space-y-2 rounded-xl border border-matchon-border bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <GymMemberAvatar src={m.profileImageUrl} name={m.name} />
                      <div className="min-w-0">
                        <p className="font-semibold text-matchon-text-primary">
                          {m.name}
                        </p>
                        <p className="font-mono text-xs text-matchon-text-secondary">
                          {m.memberNumber}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-matchon-primary">
                      {m.membershipStatusLabel}
                    </span>
                  </div>
                  <p className="text-sm text-matchon-text-secondary">
                    {formatPhoneNumber(m.phone)}
                  </p>
                  <p className="text-xs text-matchon-text-secondary">
                    {m.planName ?? "이용권 없음"}
                    {m.endsAt
                      ? ` · ${formatUtcDateOnly(m.endsAt)} (${m.expirationDisplay})`
                      : ""}
                    {m.isFighter ? " · 선수" : " · 일반"}
                  </p>
                </Link>
              ))}
            </div>

            <div className={matchonCompactTableWrapClass}>
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="border-b border-matchon-border bg-matchon-surface/50 text-xs font-medium text-matchon-text-secondary">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">회원번호</th>
                    <th className="px-3 py-2">이름</th>
                    <th className="px-3 py-2">연락처</th>
                    <th className="px-3 py-2">상태</th>
                    <th className="px-3 py-2">이용권</th>
                    <th className="px-3 py-2">만료</th>
                    <th className="px-3 py-2">구분</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-matchon-border last:border-0"
                    >
                      <td className="px-3 py-3 text-matchon-text-secondary">
                        {m.rowNumber}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs">
                        {m.memberNumber}
                      </td>
                      <td className="px-3 py-3 font-medium">
                        <span className="flex items-center gap-2">
                          <GymMemberAvatar
                            src={m.profileImageUrl}
                            name={m.name}
                            className="size-8"
                          />
                          {m.name}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {formatPhoneNumber(m.phone)}
                      </td>
                      <td className="px-3 py-3">
                        {getGymMemberStoredStatusLabel(m.status)}
                        <span className="mt-0.5 block text-xs text-matchon-text-secondary">
                          {m.membershipStatusLabel}
                        </span>
                      </td>
                      <td className="px-3 py-3">{m.planName ?? "—"}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {m.endsAt ? formatUtcDateOnly(m.endsAt) : "—"}
                        <span className="mt-0.5 block text-xs text-matchon-text-secondary">
                          {m.expirationDisplay}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {m.isFighter ? "선수" : "일반"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          href={`/gym/members/${m.id}`}
                          className="text-xs font-semibold text-matchon-primary underline"
                        >
                          상세
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {page > 1 ? (
                  <Link
                    href={`/gym/members${buildQuery({
                      ...baseParams,
                      page: String(page - 1),
                    })}`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                    )}
                  >
                    이전
                  </Link>
                ) : null}
                <span className="text-sm text-matchon-text-secondary">
                  {page} / {totalPages}
                </span>
                {page < totalPages ? (
                  <Link
                    href={`/gym/members${buildQuery({
                      ...baseParams,
                      page: String(page + 1),
                    })}`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                    )}
                  >
                    다음
                  </Link>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
