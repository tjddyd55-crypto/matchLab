import Link from "next/link";
import { requireActor } from "@/lib/auth/actor";
import { GymMemberStatus } from "@/lib/enums";
import { gymMemberService } from "@/lib/services/gym-member.service";
import { gymMemberGroupService } from "@/lib/services/gym-member-group.service";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { MemberPageHeader } from "@/components/domain/gym-members/MemberPageHeader";
import { MemberMetricCard } from "@/components/domain/gym-members/MemberMetricCard";
import { MemberFilterBar } from "@/components/domain/gym-members/MemberFilterBar";
import { MemberExcelDownloadButton } from "@/components/domain/gym-members/MemberExcelDownloadButton";
import { MemberTable } from "@/components/domain/gym-members/MemberTable";
import { MemberMobileCard } from "@/components/domain/gym-members/MemberMobileCard";
import { MatchonEmptyState } from "@/components/shared/MatchonEmptyState";
import { buttonVariants } from "@/components/ui/button";
import {
  matchonPageContainerClass,
  matchonPageStackClass,
} from "@/lib/ui/matchon-layout";
import { matchonMemberMetricsGridClass } from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Search = {
  q?: string;
  status?: string;
  fighter?: string;
  expiration?: string;
  joined?: string;
  groupId?: string;
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

function parseJoined(raw?: string): "all" | "this-month" | undefined {
  if (raw === "this-month" || raw === "all") return raw;
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

function filterHref(patch: Record<string, string | undefined>): string {
  return `/gym/members${buildQuery(patch)}`;
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
  const joinedFilter = parseJoined(sp.joined) ?? "all";
  const groupId = sp.groupId?.trim() || undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const hasListFilter = Boolean(
    q ||
      status ||
      fighterFilter !== "all" ||
      expirationFilter !== "all" ||
      joinedFilter !== "all" ||
      groupId,
  );

  const [summary, list, groups] = await Promise.all([
    gymMemberService.getSummary(actor),
    gymMemberService.listMembers(actor, {
      q,
      status,
      fighterFilter,
      expirationFilter,
      joinedFilter,
      groupId,
      page,
      pageSize: 30,
    }),
    gymMemberGroupService.listGroups(actor, false).catch(() => []),
  ]);

  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));
  const baseParams = {
    q,
    status: status ?? undefined,
    fighter: fighterFilter === "all" ? undefined : fighterFilter,
    expiration: expirationFilter === "all" ? undefined : expirationFilter,
    joined: joinedFilter === "all" ? undefined : joinedFilter,
    groupId,
  };

  const emptyTitle = q
    ? "검색 결과가 없습니다."
    : hasListFilter
      ? "선택한 조건에 해당하는 회원이 없습니다."
      : "등록된 회원이 없습니다.";
  const emptyDescription = q
    ? "검색어를 바꿔 다시 시도해 보세요."
    : hasListFilter
      ? "필터를 초기화하거나 다른 조건을 선택해 보세요."
      : "첫 회원을 등록해 보세요.";

  return (
    <div className={cn(matchonPageContainerClass, "bg-matchon-surface")}>
      <div className={matchonPageStackClass}>
        <MemberPageHeader
          title="회원관리"
          description="회원 현황과 오늘 처리할 업무를 확인하세요."
          actions={
            <>
              <MemberExcelDownloadButton filters={baseParams} />
              <Link
                href="/gym/members/new"
                className={cn(buttonVariants({ size: "sm" }), "min-h-11")}
              >
                신규 회원 등록
              </Link>
              <Link
                href="/gym/member-groups"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "min-h-11",
                )}
              >
                그룹 관리
              </Link>
              <Link
                href="/gym/membership-plans"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "min-h-11",
                )}
              >
                이용권 관리
              </Link>
            </>
          }
        />

        {/* 홈 지표 — countSummary SSOT. 오늘 PT·receivable은 loader 확장 후속. */}
        <div className={matchonMemberMetricsGridClass}>
          <MemberMetricCard
            label="전체 회원"
            value={summary.total}
            href={filterHref({})}
          />
          <MemberMetricCard
            label="이용 중"
            value={summary.inUse}
            href={filterHref({ expiration: "active" })}
          />
          <MemberMetricCard
            label="만료 예정"
            value={summary.expiring}
            href={filterHref({ expiration: "expiring" })}
          />
          <MemberMetricCard
            label="휴회 중"
            value={summary.paused}
            href={filterHref({ status: GymMemberStatus.paused })}
          />
          <MemberMetricCard
            label="이번 달 신규"
            value={summary.newThisMonth}
            href={filterHref({ joined: "this-month" })}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <section className="rounded-[10px] border border-matchon-border bg-white p-3.5">
            <h2 className="mb-3 text-[15px] font-bold text-matchon-text-primary">
              오늘 확인할 업무
            </h2>
            <ul className="space-y-2">
              <li>
                <Link
                  href={filterHref({ expiration: "expiring" })}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-matchon-border bg-amber-50 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matchon-primary/30"
                >
                  <span>
                    <span className="block text-[13px] font-semibold">
                      7일 이내 회원권 만료
                    </span>
                    <span className="text-[11px] text-matchon-text-secondary">
                      {summary.expiring}명 · endsAt 기준
                    </span>
                  </span>
                  <span className="text-xs font-medium text-matchon-primary">
                    보기
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href={filterHref({ status: GymMemberStatus.paused })}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-matchon-border bg-amber-50/70 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matchon-primary/30"
                >
                  <span>
                    <span className="block text-[13px] font-semibold">
                      휴회 중 회원
                    </span>
                    <span className="text-[11px] text-matchon-text-secondary">
                      {summary.paused}명 · status=paused
                    </span>
                  </span>
                  <span className="text-xs font-medium text-matchon-primary">
                    보기
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href={filterHref({ joined: "this-month" })}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-matchon-border px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matchon-primary/30"
                >
                  <span>
                    <span className="block text-[13px] font-semibold">
                      이번 달 등록
                    </span>
                    <span className="text-[11px] text-matchon-text-secondary">
                      {summary.newThisMonth}명 · joinedAt · Seoul 월
                    </span>
                  </span>
                  <span className="text-xs font-medium text-matchon-primary">
                    보기
                  </span>
                </Link>
              </li>
            </ul>
            {/* 미수금·오늘 PT·휴회 종료 예정: getSummary 미제공 → 1차 숨김 */}
          </section>

          <section className="rounded-[10px] border border-matchon-border bg-white p-3.5">
            <h2 className="mb-3 text-[15px] font-bold text-matchon-text-primary">
              빠른 작업
            </h2>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/gym/members/new"
                  className="block min-h-11 rounded-lg border border-matchon-border bg-matchon-surface px-3 py-3 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matchon-primary/30"
                >
                  신규 회원 등록
                </Link>
              </li>
              <li>
                <a
                  href="#member-search"
                  className="block min-h-11 rounded-lg border border-matchon-border bg-matchon-surface px-3 py-3 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matchon-primary/30"
                >
                  회원 검색
                </a>
              </li>
              <li>
                <Link
                  href="/gym/member-portal"
                  className="block min-h-11 rounded-lg border border-matchon-border bg-matchon-surface px-3 py-3 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matchon-primary/30"
                >
                  회원 전용 페이지
                </Link>
              </li>
              <li>
                <Link
                  href="/gym/membership-plans"
                  className="block min-h-11 rounded-lg border border-matchon-border bg-matchon-surface px-3 py-3 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matchon-primary/30"
                >
                  이용권 상품 관리
                </Link>
              </li>
            </ul>
          </section>
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-matchon-text-primary">
            회원 목록
          </h2>
          <p className="text-sm text-matchon-text-secondary">
            전체 {summary.total}명
            {hasListFilter ? ` · 필터 결과 ${list.total}명` : ""}
          </p>
        </div>

        <MemberFilterBar
          query={{
            q,
            status: status ?? undefined,
            fighter: fighterFilter,
            expiration: expirationFilter,
            joined: joinedFilter,
            groupId,
          }}
          groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        />

        {list.items.length === 0 ? (
          <MatchonEmptyState
            title={emptyTitle}
            description={emptyDescription}
            action={
              !hasListFilter ? (
                <Link
                  href="/gym/members/new"
                  className={cn(buttonVariants({ size: "sm" }), "min-h-11")}
                >
                  신규 회원 등록
                </Link>
              ) : (
                <Link
                  href="/gym/members"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "min-h-11",
                  )}
                >
                  필터 초기화
                </Link>
              )
            }
          />
        ) : (
          <>
            <div className="flex flex-col gap-3 lg:hidden">
              {list.items.map((m) => (
                <MemberMobileCard key={m.id} member={m} />
              ))}
            </div>

            <MemberTable members={list.items} />

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
                      "min-h-11",
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
                      "min-h-11",
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
