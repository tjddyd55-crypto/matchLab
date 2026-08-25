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
import { gymSalesService } from "@/lib/services/gym-sales.service";
import { gymScheduleService } from "@/lib/services/gym-schedule.service";
import { gymGroupClassService } from "@/lib/services/gym-group-class.service";
import { formatWon } from "@/lib/format-won";
import { MatchonStatCardButton } from "@/components/shared/MatchonStatCardButton";
import { eventManagementStatGridClass } from "@/lib/ui/event-management-ui";
import {
  matchonCompactActionBarClass,
  matchonStatLabelClass,
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

const HOME_SNIPPET_TIMEOUT_MS = 8_000;

async function loadHomeSnippet<T>(
  label: string,
  task: Promise<T>,
): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<T>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`${label} timeout`)),
        HOME_SNIPPET_TIMEOUT_MS,
      );
    });
    const result = await Promise.race([task, timeout]);
    void task.catch((error) => {
      console.error(`[gym-home] ${label} late`, error);
    });
    return result;
  } catch (error) {
    console.error(`[gym-home] ${label}`, error);
    void task.catch(() => undefined);
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

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
  if (access && !access.canEnterPortal) {
    return null;
  }
  const canCreate = access?.canCreateFighter ?? true;
  const canUpdate = access?.canUpdateFighter ?? true;
  const canManageSales = access?.canManageSales ?? false;
  const isStaffViewer = actor.role === "gym_staff";

  const [
    memberSummary,
    recentMembers,
    eventSummary,
    attendanceSummary,
    salesSummary,
    scheduleSummary,
    groupClassSummary,
  ] = await Promise.all([
    loadHomeSnippet("memberSummary", gymMemberService.getSummary(actor)),
    loadHomeSnippet(
      "recentMembers",
      prisma.gymMember.findMany({
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
      }),
    ).then((rows) => rows ?? []),
    loadHomeSnippet(
      "eventSummary",
      eventService.getGymHomeEventSummary(actor),
    ),
    isStaffViewer
      ? Promise.resolve(null)
      : loadHomeSnippet(
          "attendanceSummary",
          gymAttendanceService.getHomeAttendanceSnippet(actor),
        ),
    canManageSales
      ? loadHomeSnippet(
          "salesSummary",
          gymSalesService.getHomeSalesSnippet(actor),
        )
      : Promise.resolve(null),
    loadHomeSnippet(
      "scheduleSummary",
      gymScheduleService.getSummary(actor, { myOnly: isStaffViewer }),
    ),
    loadHomeSnippet(
      "groupClassSummary",
      gymGroupClassService.getSummary(actor, { myOnly: isStaffViewer }),
    ),
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
          <div className={eventManagementStatGridClass}>
            <MatchonStatCardButton
              label="전체 회원"
              value={memberSummary.total}
            />
            <MatchonStatCardButton
              label="일반 회원"
              value={memberSummary.withoutFighter}
            />
            <MatchonStatCardButton
              label="선수"
              value={memberSummary.withFighter}
            />
            <MatchonStatCardButton
              label="이용 중"
              value={memberSummary.inUse}
            />
            <MatchonStatCardButton
              label="만료 예정"
              value={memberSummary.expiring}
            />
            <MatchonStatCardButton
              label="이번 달 신규"
              value={memberSummary.newThisMonth}
            />
            <MatchonStatCardButton
              label="신청 가능 대회"
              value={eventSummary?.openCount ?? 0}
            />
            <MatchonStatCardButton
              label="신청 선수"
              value={eventSummary?.appliedFighterCount ?? 0}
            />
          </div>
        ) : null}

        {scheduleSummary ? (
          <section className="rounded-xl border border-matchon-border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className={matchonSectionTitleClass}>
                {isStaffViewer ? "내 오늘 일정" : "오늘 일정"}
              </h2>
              <div className="flex gap-2">
                <Link
                  href="/gym/schedules"
                  className="text-xs font-semibold text-matchon-primary underline"
                >
                  {isStaffViewer ? "내 일정" : "일정 관리"}
                </Link>
                {!isStaffViewer ? (
                  <Link
                    href="/gym/schedules/my"
                    className="text-xs font-semibold text-matchon-primary underline"
                  >
                    내 일정
                  </Link>
                ) : null}
              </div>
            </div>
            <p className="mt-2 text-lg font-bold">
              총{" "}
              {scheduleSummary.todayScheduled +
                scheduleSummary.todayCompleted +
                scheduleSummary.todayNoShow}
              건
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className={matchonStatLabelClass}>진행 예정</p>
                <p className="text-lg font-bold">
                  {scheduleSummary.todayScheduled}
                </p>
              </div>
              <div>
                <p className={matchonStatLabelClass}>완료</p>
                <p className="text-lg font-bold">
                  {scheduleSummary.todayCompleted}
                </p>
              </div>
              <div>
                <p className={matchonStatLabelClass}>노쇼</p>
                <p className="text-lg font-bold">
                  {scheduleSummary.todayNoShow}
                </p>
              </div>
              <div>
                <p className={matchonStatLabelClass}>이번 주 예정</p>
                <p className="text-lg font-bold">
                  {scheduleSummary.weekScheduled}
                </p>
              </div>
            </div>
            {scheduleSummary.next ? (
              <p className="mt-3 text-sm text-matchon-text-secondary">
                다음 일정 {scheduleSummary.next.timeRangeLabel}{" "}
                {scheduleSummary.next.memberName} 회원
              </p>
            ) : null}
            {isStaffViewer ? (
              <div className="mt-4">
                <Link
                  href="/gym/schedules"
                  className={cn(buttonVariants({ size: "sm" }))}
                >
                  내 일정 확인
                </Link>
              </div>
            ) : null}
          </section>
        ) : null}

        {groupClassSummary ? (
          <section className="rounded-xl border border-matchon-border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className={matchonSectionTitleClass}>
                {isStaffViewer ? "내 그룹수업" : "그룹수업"}
              </h2>
              <Link
                href="/gym/group-classes"
                className="text-xs font-semibold text-matchon-primary underline"
              >
                그룹수업 관리
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className={matchonStatLabelClass}>오늘</p>
                <p className="text-lg font-bold">{groupClassSummary.todayCount}</p>
              </div>
              <div>
                <p className={matchonStatLabelClass}>이번 주</p>
                <p className="text-lg font-bold">{groupClassSummary.weekCount}</p>
              </div>
              <div>
                <p className={matchonStatLabelClass}>
                  {isStaffViewer ? "예정 참석" : "오늘 참석 예정"}
                </p>
                <p className="text-lg font-bold">
                  {groupClassSummary.attendingToday}
                </p>
              </div>
              <div>
                <p className={matchonStatLabelClass}>
                  {isStaffViewer ? "대기" : "정원 마감"}
                </p>
                <p className="text-lg font-bold">
                  {isStaffViewer
                    ? groupClassSummary.waitToday
                    : groupClassSummary.fullToday}
                </p>
              </div>
            </div>
            {!isStaffViewer && groupClassSummary.waitToday > 0 ? (
              <p className="mt-2 text-sm text-matchon-text-secondary">
                대기 발생 수업 {groupClassSummary.waitToday}건
              </p>
            ) : null}
            {groupClassSummary.next ? (
              <p className="mt-3 text-sm text-matchon-text-secondary">
                다음 그룹수업 {groupClassSummary.next.timeRangeLabel}{" "}
                {groupClassSummary.next.title}
              </p>
            ) : null}
          </section>
        ) : null}

        {attendanceSummary || salesSummary ? (
          <section className="rounded-xl border border-matchon-border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className={matchonSectionTitleClass}>오늘 운영 현황</h2>
              <div className="flex gap-2">
                {attendanceSummary ? (
                  <Link
                    href="/gym/attendance"
                    className="text-xs font-semibold text-matchon-primary underline"
                  >
                    출석 관리
                  </Link>
                ) : null}
                {salesSummary ? (
                  <Link
                    href="/gym/sales"
                    className="text-xs font-semibold text-matchon-primary underline"
                  >
                    매출 관리
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {attendanceSummary ? (
                <>
                  <div>
                    <p className={matchonStatLabelClass}>오늘 출석</p>
                    <p className="text-lg font-bold">
                      {attendanceSummary.todayCount}
                    </p>
                  </div>
                  <div>
                    <p className={matchonStatLabelClass}>확인 필요</p>
                    <p className="text-lg font-bold">
                      {attendanceSummary.deskNoticeCount}
                    </p>
                  </div>
                </>
              ) : null}
              {salesSummary ? (
                <div>
                  <p className={matchonStatLabelClass}>오늘 매출</p>
                  <p className="text-lg font-bold">
                    {formatWon(salesSummary.todayNet)}
                  </p>
                </div>
              ) : null}
            </div>
            <div className="mt-4 border-t border-matchon-border pt-3">
              <h3 className="text-sm font-semibold text-matchon-text-primary">
                이번 달 현황
              </h3>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {attendanceSummary ? (
                  <div>
                    <p className={matchonStatLabelClass}>이번 달 출석</p>
                    <p className="text-lg font-bold">
                      {attendanceSummary.monthCount}
                    </p>
                  </div>
                ) : null}
                {salesSummary ? (
                  <>
                    <div>
                      <p className={matchonStatLabelClass}>이번 달 순매출</p>
                      <p className="text-lg font-bold">
                        {formatWon(salesSummary.monthNet)}
                      </p>
                    </div>
                    <div>
                      <p className={matchonStatLabelClass}>미수금</p>
                      <p className="text-lg font-bold">
                        {formatWon(salesSummary.outstandingTotal)}
                      </p>
                    </div>
                  </>
                ) : null}
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
          {canManageSales ? (
            <Link
              href="/gym/sales"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              매출 관리
            </Link>
          ) : null}
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
