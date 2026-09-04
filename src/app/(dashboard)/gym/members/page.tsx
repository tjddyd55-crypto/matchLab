import Link from "next/link";
import { requireActor } from "@/lib/auth/actor";
import { GymMemberStatus } from "@/lib/enums";
import { gymMemberService } from "@/lib/services/gym-member.service";
import { gymMemberGroupService } from "@/lib/services/gym-member-group.service";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { MemberPageHeader } from "@/components/domain/gym-members/MemberPageHeader";
import { MemberCompactStatsStrip } from "@/components/domain/gym-members/MemberCompactStatsStrip";
import { MemberFilterBar } from "@/components/domain/gym-members/MemberFilterBar";
import { MemberExcelDownloadButton } from "@/components/domain/gym-members/MemberExcelDownloadButton";
import { MemberExcelImportButton } from "@/components/domain/gym-members/MemberExcelImportDialog";
import { GymMemberSelfRegistrationLinkButton } from "@/components/domain/gym-member-self-registration/GymMemberSelfRegistrationLinkDialog";
import { gymMemberSelfRegistrationService } from "@/lib/services/gym-member-self-registration.service";
import { GymMemberBulkSmsButton } from "@/components/domain/gym-members/GymMemberBulkSmsButton";
import { MemberTable } from "@/components/domain/gym-members/MemberTable";
import { MemberMobileCard } from "@/components/domain/gym-members/MemberMobileCard";
import { MatchonEmptyState } from "@/components/shared/MatchonEmptyState";
import { buttonVariants } from "@/components/ui/button";
import { matchonPageContainerClass } from "@/lib/ui/matchon-layout";
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

export default async function GymMembersPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const actor = await requireActor();
  const sp = await searchParams;

  if (!actor.gymId) {
    return (
      <div className={cn(matchonPageContainerClass, "overflow-x-hidden")}>
        <GymProfileMissingBanner />
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

  const [summary, list, groups, pendingSelfReg] = await Promise.all([
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
    gymMemberSelfRegistrationService.countPending(actor).catch(() => 0),
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

  const countLabel = hasListFilter
    ? `필터 결과 ${list.total}명 · 전체 ${summary.total}명`
    : `전체 회원 ${summary.total}명`;

  return (
    <div
      className={cn(
        matchonPageContainerClass,
        "overflow-x-hidden bg-matchon-surface py-2 md:py-3",
      )}
    >
      <div className="mx-0 flex w-full max-w-[78rem] flex-col gap-2">
        <MemberPageHeader
          title="회원관리"
          className="gap-1.5 sm:items-center [&_h1]:text-lg [&_h1]:md:text-xl"
          actions={
            <div className="flex flex-wrap items-center gap-1.5">
              <GymMemberBulkSmsButton
                memberIds={list.items.map((r) => r.id)}
                selectedIds={[]}
              />
              <Link
                href="/gym/members/new"
                className={cn(buttonVariants({ size: "sm" }), "min-h-8")}
              >
                + 신규 회원
              </Link>
              <Link
                href="/gym/members/registrations?status=pending"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "min-h-8",
                )}
              >
                등록 요청{pendingSelfReg > 0 ? ` ${pendingSelfReg}` : ""}
              </Link>
              <details className="relative">
                <summary className="cursor-pointer list-none rounded-md border border-matchon-border bg-white px-2.5 py-1.5 text-xs font-medium text-matchon-text-secondary hover:text-matchon-primary [&::-webkit-details-marker]:hidden">
                  더보기 ▾
                </summary>
                <div className="absolute right-0 z-20 mt-1 flex min-w-[11rem] flex-col gap-0.5 rounded-md border border-matchon-border bg-white p-1.5 shadow-md">
                  <div className="px-1 py-0.5">
                    <MemberExcelDownloadButton
                      filters={baseParams}
                      filteredCount={list.total}
                      totalCount={summary.total}
                      hasActiveFilters={hasListFilter}
                    />
                  </div>
                  <div className="px-1 py-0.5">
                    <MemberExcelImportButton />
                  </div>
                  <div className="px-1 py-0.5">
                    <GymMemberSelfRegistrationLinkButton />
                  </div>
                  <Link
                    href="/gym/member-groups"
                    className="rounded px-2 py-1.5 text-xs text-matchon-text-secondary hover:bg-matchon-surface hover:text-matchon-primary"
                  >
                    그룹 관리
                  </Link>
                  <Link
                    href="/gym/membership-plans"
                    className="rounded px-2 py-1.5 text-xs text-matchon-text-secondary hover:bg-matchon-surface hover:text-matchon-primary"
                  >
                    이용권 관리
                  </Link>
                  <Link
                    href="/gym/member-portal"
                    className="rounded px-2 py-1.5 text-xs text-matchon-text-secondary hover:bg-matchon-surface hover:text-matchon-primary"
                  >
                    회원전용
                  </Link>
                </div>
              </details>
            </div>
          }
        />

        <MemberCompactStatsStrip
          summary={summary}
          active={{
            expiration:
              expirationFilter !== "all" ? expirationFilter : undefined,
            status: status ?? undefined,
            joined: joinedFilter !== "all" ? joinedFilter : undefined,
          }}
        />

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
          resultCountLabel={countLabel}
        />

        {list.items.length === 0 ? (
          <MatchonEmptyState
            title={emptyTitle}
            description={emptyDescription}
            action={
              !hasListFilter ? (
                <Link
                  href="/gym/members/new"
                  className={cn(buttonVariants({ size: "sm" }), "min-h-9")}
                >
                  신규 회원 등록
                </Link>
              ) : (
                <Link
                  href="/gym/members"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "min-h-9",
                  )}
                >
                  필터 초기화
                </Link>
              )
            }
          />
        ) : (
          <>
            <div className="flex flex-col gap-2 overflow-x-hidden lg:hidden">
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
                      "min-h-9",
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
                      "min-h-9",
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
