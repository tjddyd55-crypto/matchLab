import Link from "next/link";
import type { ReactNode } from "react";
import { format } from "date-fns";
import { buttonVariants } from "@/components/ui/button";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { MatchonEmptyState } from "@/components/shared/MatchonEmptyState";
import { requireActor } from "@/lib/auth/actor";
import { resolveGymPortalAccess } from "@/lib/gym-portal-access";
import { prisma } from "@/lib/prisma";
import { eventService } from "@/lib/services/event.service";
import { gymMemberService } from "@/lib/services/gym-member.service";
import { gymAttendanceService } from "@/lib/services/gym-attendance.service";
import {
  matchonCompactActionBarClass,
  matchonStatCardClass,
  matchonStatLabelClass,
  matchonStatValueClass,
  matchonStatsGridClass,
} from "@/lib/ui/matchon-shell-ui";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
  matchonSectionTitleClass,
} from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function GymProfileShell({ children }: { children: ReactNode }) {
  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>{children}</div>
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "yyyy-MM-dd");
}

export default async function GymHomePage() {
  const actor = await requireActor();

  if (!actor.gymId) {
    return (
      <GymProfileShell>
        <GymProfileMissingBanner />
      </GymProfileShell>
    );
  }

  const access = await resolveGymPortalAccess(actor).catch(() => null);
  const canCreate = access?.canCreateFighter ?? true;
  const canUpdate = access?.canUpdateFighter ?? true;

  const [memberSummary, recentMembers, eventSummary, attendanceSummary] =
    await Promise.all([
    gymMemberService.getSummary(actor).catch(() => null),
    prisma.gymMember
      .findMany({
        where: { gymId: actor.gymId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
          memberNumber: true,
          fighter: { select: { id: true } },
        },
      })
      .catch(() => []),
    eventService.getGymHomeEventSummary(actor).catch(() => null),
    gymAttendanceService.getHomeAttendanceSnippet(actor),
  ]);

  const hasMembers = (memberSummary?.total ?? 0) > 0;

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <div className="min-w-0 space-y-1">
          <h1 className={matchonPageTitleClass}>체육관 홈</h1>
          <p className={matchonPageDescClass}>
            회원과 선수를 관리하고, 참가 가능한 대회를 확인하여 출전 신청할 수
            있습니다.
          </p>
        </div>

        {memberSummary ? (
          <div className={matchonStatsGridClass}>
            <div className={matchonStatCardClass}>
              <p className={matchonStatLabelClass}>전체 회원</p>
              <p className={matchonStatValueClass}>{memberSummary.total}</p>
            </div>
            <div className={matchonStatCardClass}>
              <p className={matchonStatLabelClass}>일반 회원</p>
              <p className={matchonStatValueClass}>
                {memberSummary.withoutFighter}
              </p>
            </div>
            <div className={matchonStatCardClass}>
              <p className={matchonStatLabelClass}>선수</p>
              <p className={matchonStatValueClass}>
                {memberSummary.withFighter}
              </p>
            </div>
            <div className={matchonStatCardClass}>
              <p className={matchonStatLabelClass}>이용 중</p>
              <p className={matchonStatValueClass}>{memberSummary.inUse}</p>
            </div>
            <div className={matchonStatCardClass}>
              <p className={matchonStatLabelClass}>만료 예정</p>
              <p className={matchonStatValueClass}>{memberSummary.expiring}</p>
            </div>
            <div className={matchonStatCardClass}>
              <p className={matchonStatLabelClass}>이번 달 신규</p>
              <p className={matchonStatValueClass}>
                {memberSummary.newThisMonth}
              </p>
            </div>
            <div className={matchonStatCardClass}>
              <p className={matchonStatLabelClass}>신청 가능 대회</p>
              <p className={matchonStatValueClass}>
                {eventSummary?.openCount ?? 0}
              </p>
            </div>
            <div className={matchonStatCardClass}>
              <p className={matchonStatLabelClass}>신청 선수</p>
              <p className={matchonStatValueClass}>
                {eventSummary?.appliedFighterCount ?? 0}
              </p>
            </div>
          </div>
        ) : null}

        {attendanceSummary ? (
          <section className="rounded-xl border border-matchon-border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className={matchonSectionTitleClass}>오늘 출석</h2>
              <div className="flex gap-2">
                <Link
                  href="/gym/attendance"
                  className="text-xs font-semibold text-matchon-primary underline"
                >
                  출석 관리
                </Link>
                <Link
                  href="/gym/attendance/kiosks"
                  className="text-xs font-semibold text-matchon-primary underline"
                >
                  출석 화면
                </Link>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div>
                <p className={matchonStatLabelClass}>오늘</p>
                <p className="text-lg font-bold">{attendanceSummary.todayCount}</p>
              </div>
              <div>
                <p className={matchonStatLabelClass}>이번 달</p>
                <p className="text-lg font-bold">{attendanceSummary.monthCount}</p>
              </div>
              <div>
                <p className={matchonStatLabelClass}>확인 필요</p>
                <p className="text-lg font-bold">
                  {attendanceSummary.deskNoticeCount}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <div className={matchonCompactActionBarClass}>
          <Link
            href="/gym/events"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            대회 목록
          </Link>
          <Link
            href="/gym/applications"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            신청 내역
          </Link>
          <Link
            href="/gym/members/new"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            회원 등록
          </Link>
          <Link
            href="/gym/attendance"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            출석 관리
          </Link>
          <Link
            href="/gym/attendance/kiosks"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            출석 화면
          </Link>
          {canCreate ? (
            <Link
              href="/gym/fighters/new"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              선수 등록
            </Link>
          ) : (
            <span
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "pointer-events-none opacity-50",
              )}
              aria-disabled
            >
              선수 등록
            </span>
          )}
          <Link
            href="/gym/profile"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            체육관 정보
          </Link>
        </div>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className={matchonSectionTitleClass}>신청 가능한 대회</h2>
            <Link
              href="/gym/events"
              className="text-xs font-semibold text-matchon-primary underline"
            >
              대회 목록 보기
            </Link>
          </div>
          {!eventSummary || eventSummary.openEvents.length === 0 ? (
            <MatchonEmptyState
              title="현재 신청 가능한 대회가 없습니다"
              description="모집 중인 대회가 공개되면 여기에 표시됩니다."
              action={
                <Link
                  href="/gym/events"
                  className={cn(buttonVariants({ size: "sm" }))}
                >
                  대회 목록 보기
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-matchon-border rounded-md border border-matchon-border bg-white">
              {eventSummary.openEvents.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-matchon-text-primary">
                      {e.title}
                    </p>
                    <p className="text-xs text-matchon-text-secondary">
                      개최 {formatDate(e.eventDate)} · 접수 마감{" "}
                      {formatDate(e.registrationEndDate)} · 신청{" "}
                      {e.gymApplicationCount}명
                    </p>
                  </div>
                  <Link
                    href={`/gym/events/${e.id}/apply`}
                    className={cn(buttonVariants({ size: "sm" }))}
                  >
                    신청하기
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className={matchonSectionTitleClass}>최근 등록 회원</h2>
          {!hasMembers || recentMembers.length === 0 ? (
            <MatchonEmptyState
              title="등록된 회원이 없습니다"
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
            <ul className="divide-y divide-matchon-border rounded-md border border-matchon-border bg-white">
              {recentMembers.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium text-matchon-text-primary">
                      {m.name}
                    </p>
                    <p className="text-xs text-matchon-text-secondary">
                      {m.memberNumber} · {m.status}
                      {m.fighter ? " · 선수" : " · 일반"} ·{" "}
                      {format(m.createdAt, "yyyy-MM-dd")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/gym/members/${m.id}`}
                      className="text-xs font-semibold text-matchon-primary underline"
                    >
                      상세
                    </Link>
                    {m.fighter && canUpdate ? (
                      <Link
                        href={`/gym/fighters/${m.fighter.id}/edit`}
                        className="text-xs font-semibold text-matchon-text-secondary underline"
                      >
                        선수
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
