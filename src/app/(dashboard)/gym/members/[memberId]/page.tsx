import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { PermissionError } from "@/lib/auth/permission-error";
import { formatPhoneNumber } from "@/lib/phone";
import { formatUtcDateOnly } from "@/lib/date-only";
import { formatWon } from "@/lib/format-won";
import {
  getGymMemberStoredStatusLabel,
  type GymMemberMembershipDisplayStatus,
} from "@/lib/gym-member-membership-status";
import { getSeoulYmdParts } from "@/lib/gym-attendance/seoul-date";
import { gymAttendanceService } from "@/lib/services/gym-attendance.service";
import { gymMemberService } from "@/lib/services/gym-member.service";
import { gymMemberSelfRegistrationService } from "@/lib/services/gym-member-self-registration.service";
import { gymMembershipPlanService } from "@/lib/services/gym-membership-plan.service";
import { gymMemberLockerService } from "@/lib/services/gym-member-locker.service";
import { gymMemberGroupService } from "@/lib/services/gym-member-group.service";
import { gymSalesService } from "@/lib/services/gym-sales.service";
import { gymMembershipSaleService } from "@/lib/services/gym-membership-sale.service";
import { GymMemberAttendanceCalendar } from "@/components/domain/gym-attendance/GymMemberAttendanceCalendar";
import { GymMemberAvatar } from "@/components/domain/gym-members/GymMemberAvatar";
import { GymMemberAssignedStaffSection } from "@/components/domain/gym-members/GymMemberAssignedStaffSection";
import { GymMemberUpcomingSchedulesSection } from "@/components/domain/gym-members/GymMemberUpcomingSchedulesSection";
import { GymMemberDetailActions } from "@/components/domain/gym-members/GymMemberDetailActions";
import { GymMemberMembershipPanel } from "@/components/domain/gym-members/GymMemberMembershipPanel";
import { GymMemberLockerPanel } from "@/components/domain/gym-members/GymMemberLockerPanel";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { buttonVariants } from "@/components/ui/button";
import { resolveGymPortalAccess } from "@/lib/gym-portal-access";
import { GymMemberGroupClassesSection } from "@/components/domain/gym-group-classes/GymMemberGroupClassesSection";
import { gymGroupClassService } from "@/lib/services/gym-group-class.service";
import { gymScheduleService } from "@/lib/services/gym-schedule.service";
import { gymStaffService } from "@/lib/services/gym-staff.service";
import { MemberAlert } from "@/components/domain/gym-members/MemberAlert";
import { MemberCopyPhoneButton } from "@/components/domain/gym-members/MemberCopyPhoneButton";
import {
  MemberDetailTabs,
  type MemberDetailTabId,
} from "@/components/domain/gym-members/MemberDetailTabs";
import { MemberStatusBadge } from "@/components/domain/gym-members/MemberStatusBadge";
import {
  matchonPageContainerClass,
  matchonPageStackClass,
  matchonSectionTitleClass,
} from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-matchon-border py-1.5 text-xs last:border-0">
      <span className="text-matchon-text-secondary">{label}</span>
      <span className="max-w-[70%] text-right text-matchon-text-primary break-words">
        {value}
      </span>
    </div>
  );
}

function OverviewStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="border-b border-matchon-border px-2 py-2 last:border-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="text-[10px] font-medium text-matchon-text-secondary">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-matchon-text-primary">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-[11px] text-matchon-text-secondary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function parseTab(raw: unknown): MemberDetailTabId {
  if (
    raw === "membership" ||
    raw === "schedule" ||
    raw === "participation" ||
    raw === "fighter"
  ) {
    return raw;
  }
  return "overview";
}

function membershipAlert(
  status: GymMemberMembershipDisplayStatus,
  expirationDisplay: string,
): { tone: "warning" | "danger" | "info"; text: string } | null {
  if (status === "expiring") {
    return {
      tone: "warning",
      text: `회원권 만료 임박 · ${expirationDisplay} · 연장 또는 결제 확인`,
    };
  }
  if (status === "expired") {
    return {
      tone: "danger",
      text: `회원권 만료 · ${expirationDisplay}`,
    };
  }
  if (status === "paused") {
    return { tone: "warning", text: "휴회 중" };
  }
  if (status === "no_plan") {
    return { tone: "info", text: "회원권 없음 · 이용권을 배정해 주세요" };
  }
  return null;
}

export default async function GymMemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ memberId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor();
  const { memberId } = await params;
  const sp = await searchParams;
  const tab = parseTab(typeof sp.tab === "string" ? sp.tab : undefined);

  if (!actor.gymId) {
    return (
      <div className={matchonPageContainerClass}>
        <div className={matchonPageStackClass}>
          <GymProfileMissingBanner />
        </div>
      </div>
    );
  }

  const seoul = getSeoulYmdParts();
  const yearRaw =
    typeof sp.attendanceYear === "string" ? Number(sp.attendanceYear) : seoul.year;
  const monthRaw =
    typeof sp.attendanceMonth === "string"
      ? Number(sp.attendanceMonth)
      : seoul.month;
  const calYear = Number.isFinite(yearRaw) ? yearRaw : seoul.year;
  const calMonth = Number.isFinite(monthRaw) ? monthRaw : seoul.month;

  let detail;
  let plans;
  let attendanceSummary;
  let attendanceCalendar;
  let salesSummary;
  let lockerRentals: Awaited<
    ReturnType<typeof gymMemberLockerService.listRentals>
  > = [];
  let memberGroups: Awaited<
    ReturnType<typeof gymMemberGroupService.listMemberAssignments>
  > = [];
  let assignedStaff: Awaited<
    ReturnType<typeof gymStaffService.listAssignmentsForMember>
  > = [];
  let upcomingSchedules: Awaited<
    ReturnType<typeof gymScheduleService.getMemberUpcoming>
  > = [];
  let upcomingGroupClasses: Awaited<
    ReturnType<typeof gymGroupClassService.getMemberUpcoming>
  > = [];
  const access = await resolveGymPortalAccess(actor).catch(() => null);
  try {
    [
      detail,
      plans,
      attendanceSummary,
      attendanceCalendar,
      salesSummary,
      lockerRentals,
      memberGroups,
      assignedStaff,
      upcomingSchedules,
      upcomingGroupClasses,
    ] = await Promise.all([
      gymMemberService.getMemberDetail(actor, memberId),
      gymMembershipPlanService.listPlans(actor, false).catch(() => []),
      gymAttendanceService.getGymMemberAttendanceSummary(actor, memberId),
      gymAttendanceService.getGymMemberAttendanceCalendar(
        actor,
        memberId,
        calYear,
        calMonth,
      ),
      gymSalesService.getMemberSalesSummary(actor, memberId).catch(() => null),
      gymMemberLockerService.listRentals(actor, memberId).catch(() => []),
      gymMemberGroupService.listMemberAssignments(actor, memberId).catch(() => []),
      gymStaffService.listAssignmentsForMember(actor, memberId).catch(() => []),
      gymScheduleService.getMemberUpcoming(actor, memberId, 30).catch(() => []),
      gymGroupClassService.getMemberUpcoming(actor, memberId, 30).catch(() => []),
    ]);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    if (e instanceof AppError && e.code === "FORBIDDEN") notFound();
    if (e instanceof PermissionError) notFound();
    throw e;
  }

  const selfRegistrationDocument =
    await gymMemberSelfRegistrationService
      .getDocumentForMember(actor, memberId)
      .catch(() => null);

  const {
    member,
    currentSubscription,
    membershipStatus,
    membershipStatusLabel,
    expirationDisplay,
    daysRemaining,
  } = detail;
  const addressLine = [member.address, member.addressDetail]
    .filter(Boolean)
    .join(" ");
  const alert = membershipAlert(membershipStatus, expirationDisplay);
  const primaryStaff =
    assignedStaff.find((r) => r.isPrimary)?.staffName ??
    assignedStaff[0]?.staffName;
  const nextPt = upcomingSchedules[0];
  const nextGroup = upcomingGroupClasses[0];
  const latestPayment = salesSummary?.payments[0];

  const attendanceQs: Record<string, string | undefined> = {
    attendanceYear:
      typeof sp.attendanceYear === "string" ? sp.attendanceYear : undefined,
    attendanceMonth:
      typeof sp.attendanceMonth === "string" ? sp.attendanceMonth : undefined,
  };

  let membershipMoney = null as Awaited<
    ReturnType<typeof gymMembershipSaleService.getSubscriptionMoneySummary>
  > | null;
  let membershipTimeline: Awaited<
    ReturnType<typeof gymMembershipSaleService.buildTimeline>
  > = [];
  let subscriptionHistory: Awaited<
    ReturnType<typeof gymMembershipSaleService.listSubscriptionHistory>
  > = { totalCount: 0, matchonRenewalCount: 0, rows: [] };
  if (currentSubscription) {
    try {
      membershipMoney =
        await gymMembershipSaleService.getSubscriptionMoneySummary(
          actor,
          memberId,
          currentSubscription.id,
        );
    } catch {
      membershipMoney = null;
    }
  }
  try {
    membershipTimeline = await gymMembershipSaleService.buildTimeline(
      actor,
      memberId,
    );
  } catch {
    membershipTimeline = [];
  }
  if (tab === "membership") {
    try {
      subscriptionHistory =
        await gymMembershipSaleService.listSubscriptionHistory(
          actor,
          memberId,
        );
    } catch {
      subscriptionHistory = {
        totalCount: 0,
        matchonRenewalCount: 0,
        rows: [],
      };
    }
  }

  const detailActions = (
    <>
      {selfRegistrationDocument ? (
        <Link
          href={`/gym/members/registrations/${selfRegistrationDocument.id}`}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "min-h-11",
          )}
        >
          가입 신청서 보기
        </Link>
      ) : null}
      <GymMemberDetailActions
        memberId={member.id}
        memberStatus={member.status}
        hasFighter={Boolean(member.fighter)}
        defaultPrimarySport={member.primarySport}
      />
    </>
  );

  return (
    <div className={cn(matchonPageContainerClass, "bg-matchon-surface")}>
      <div className={matchonPageStackClass}>
        <div className="min-w-0">
          <Link
            href="/gym/members"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 mb-2 min-h-11",
            )}
          >
            ← 회원 목록
          </Link>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-2.5">
              <GymMemberAvatar
                src={detail.profileImageUrl}
                name={member.name}
                className="size-10 shrink-0 sm:size-11"
              />
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h1 className="truncate text-lg font-bold tracking-tight text-matchon-text-primary sm:text-xl">
                    {member.name}
                  </h1>
                  <MemberStatusBadge
                    label={membershipStatusLabel}
                    tone={membershipStatus}
                  />
                  {member.fighter ? (
                    <MemberStatusBadge label="선수" tone="fighter" />
                  ) : null}
                </div>
                <p className="text-xs text-matchon-text-secondary sm:text-[12px]">
                  {formatPhoneNumber(member.phone)}
                  {member.joinedAt
                    ? ` · 등록 ${formatUtcDateOnly(member.joinedAt)}`
                    : ""}
                  {primaryStaff ? ` · 담당 ${primaryStaff}` : ""}
                </p>
                <p className="font-mono text-[11px] text-matchon-text-secondary">
                  {member.memberNumber} ·{" "}
                  {getGymMemberStoredStatusLabel(member.status)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/gym/members/${member.id}/edit`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "min-h-11",
                )}
              >
                회원 수정
              </Link>
              <MemberCopyPhoneButton phone={formatPhoneNumber(member.phone)} />
              <Link
                href={`/gym/members/${member.id}?tab=membership`}
                className={cn(buttonVariants({ size: "sm" }), "min-h-11")}
              >
                회원권·결제
              </Link>
              {member.fighter ? (
                <Link
                  href={`/gym/fighters/${member.fighter.id}/edit`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "min-h-11",
                  )}
                >
                  선수 정보
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        {alert ? <MemberAlert tone={alert.tone}>{alert.text}</MemberAlert> : null}

        {tab === "overview" ? (
          <section className="rounded-[10px] border border-matchon-border bg-white p-3">
            <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-4">
              <OverviewStat
                label="현재 회원권"
                value={currentSubscription?.planNameSnapshot ?? "회원권 없음"}
                hint={
                  currentSubscription
                    ? daysRemaining != null && daysRemaining >= 0
                      ? `잔여 ${daysRemaining}일`
                      : expirationDisplay
                    : undefined
                }
              />
              {nextPt ? (
                <OverviewStat
                  label="다음 PT"
                  value={nextPt.timeRangeLabel}
                  hint={`${nextPt.scheduleTypeLabel} · ${nextPt.staffName}`}
                />
              ) : null}
              {nextGroup ? (
                <OverviewStat
                  label="다음 그룹수업"
                  value={nextGroup.title}
                  hint={nextGroup.timeRangeLabel}
                />
              ) : null}
              {latestPayment ? (
                <OverviewStat
                  label="최근 결제"
                  value={formatWon(latestPayment.amount)}
                  hint={`${formatUtcDateOnly(latestPayment.paidAt)} · ${latestPayment.paymentMethodLabel}`}
                />
              ) : salesSummary ? (
                <OverviewStat label="최근 결제" value="결제 기록 없음" />
              ) : null}
            </div>
          </section>
        ) : null}

        <MemberDetailTabs
          memberId={member.id}
          active={tab}
          extraQuery={attendanceQs}
        />

        {tab === "overview" ? (
          <div className="grid gap-3 lg:grid-cols-2">
            <section className="rounded-[10px] border border-matchon-border bg-white p-3">
              <h2 className={cn(matchonSectionTitleClass, "mb-2 text-xs")}>
                기본정보
              </h2>
              <InfoRow
                label="휴대폰"
                value={formatPhoneNumber(member.phone)}
              />
              <InfoRow
                label="생년월일"
                value={
                  member.birthDate ? formatUtcDateOnly(member.birthDate) : "—"
                }
              />
              <InfoRow label="성별" value={member.gender ?? "—"} />
              <InfoRow label="이메일" value={member.email ?? "—"} />
              <InfoRow
                label="보호자(비상연락처)"
                value={
                  [
                    member.guardianName?.trim() ||
                      member.emergencyContactName?.trim(),
                    member.guardianPhone?.trim() ||
                      member.emergencyContactPhone?.trim(),
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"
                }
              />
              <InfoRow label="등급" value={member.rankName ?? "—"} />
              <InfoRow
                label="그룹"
                value={
                  memberGroups.length
                    ? memberGroups.map((a) => a.group.name).join(", ")
                    : "—"
                }
              />
              <InfoRow
                label="주소"
                value={
                  addressLine
                    ? `${member.postalCode ? `(${member.postalCode}) ` : ""}${addressLine}`
                    : "—"
                }
              />
              <InfoRow label="메모" value={member.memo ?? "—"} />
            </section>

            <section className="rounded-[10px] border border-matchon-border bg-white p-3">
              <h2 className={cn(matchonSectionTitleClass, "mb-2 text-xs")}>
                현재 회원권
              </h2>
              {currentSubscription ? (
                <>
                  <InfoRow
                    label="상품"
                    value={currentSubscription.planNameSnapshot}
                  />
                  <InfoRow
                    label="기간"
                    value={`${formatUtcDateOnly(currentSubscription.startedAt)}${
                      currentSubscription.endsAt
                        ? ` – ${formatUtcDateOnly(currentSubscription.endsAt)}`
                        : ""
                    }`}
                  />
                  <InfoRow label="상태" value={currentSubscription.status} />
                  <InfoRow label="만료" value={expirationDisplay} />
                  <div className="pt-3">
                    <Link
                      href={`/gym/members/${member.id}?tab=membership`}
                      className={cn(buttonVariants({ size: "sm" }), "min-h-11")}
                    >
                      회원권·결제 관리
                    </Link>
                  </div>
                </>
              ) : (
                <p className="text-sm text-matchon-text-secondary">
                  배정된 이용권이 없습니다.
                </p>
              )}
            </section>

            <div className="lg:col-span-2">
              <GymMemberLockerPanel
                memberId={member.id}
                rentals={lockerRentals}
              />
            </div>

            <div className="lg:col-span-2">
              <GymMemberAssignedStaffSection
                rows={assignedStaff}
                isOwner={Boolean(access?.isOwner || actor.role === "admin")}
              />
            </div>

            <div className="lg:col-span-2">
              <GymMemberAttendanceCalendar
                memberId={member.id}
                memberName={member.name}
                year={attendanceCalendar.year}
                month={attendanceCalendar.month}
                days={attendanceCalendar.days}
                summary={attendanceSummary}
              />
            </div>
          </div>
        ) : null}

        {tab === "membership" ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)]">
            <GymMemberMembershipPanel
              memberId={member.id}
              plans={plans.map((p) => ({
                id: p.id,
                name: p.name,
                price: p.price,
                durationType: p.durationType,
                durationValue: p.durationValue,
              }))}
              currentSubscription={
                currentSubscription
                  ? {
                      id: currentSubscription.id,
                      planId: currentSubscription.planId,
                      planNameSnapshot: currentSubscription.planNameSnapshot,
                      status: currentSubscription.status,
                      startedAt: currentSubscription.startedAt,
                      endsAt: currentSubscription.endsAt,
                      priceSnapshot: currentSubscription.priceSnapshot,
                      memo: currentSubscription.memo,
                    }
                  : null
              }
              money={membershipMoney}
              timeline={membershipTimeline}
              subscriptionHistory={subscriptionHistory}
              statusLabel={membershipStatusLabel}
            />
            {detailActions}
          </div>
        ) : null}

        {tab === "schedule" ? (
          <GymMemberUpcomingSchedulesSection
            items={upcomingSchedules}
            memberId={memberId}
            canCreate={Boolean(
              access?.isOwner ||
                actor.role === "admin" ||
                actor.role === "gym_staff",
            )}
          />
        ) : null}

        {tab === "participation" ? (
          <GymMemberGroupClassesSection
            items={upcomingGroupClasses}
            canCreate={Boolean(
              access?.isOwner ||
                actor.role === "admin" ||
                actor.role === "gym_staff",
            )}
          />
        ) : null}

        {tab === "fighter" ? (
          <section className="rounded-[10px] border border-matchon-border bg-white p-4">
            <h2 className={cn(matchonSectionTitleClass, "mb-3")}>선수정보</h2>
            {member.fighter ? (
              <>
                <InfoRow
                  label="선수 코드"
                  value={member.fighter.fighterCode}
                />
                <InfoRow label="상태" value={member.fighter.status} />
                <InfoRow
                  label="전적"
                  value={`${member.fighter.recordWin}승 ${member.fighter.recordLoss}패 ${member.fighter.recordDraw}무`}
                />
                <div className="pt-3">
                  <Link
                    href={`/gym/fighters/${member.fighter.id}/edit`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "min-h-11",
                    )}
                  >
                    선수 정보 수정
                  </Link>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-matchon-text-primary">
                  일반 회원
                </p>
                <p className="text-sm text-matchon-text-secondary">
                  이 회원은 아직 선수 정보가 없습니다. 회원권·결제 탭의 운영
                  액션에서 선수로 승격할 수 있습니다.
                </p>
                <Link
                  href={`/gym/members/${member.id}?tab=membership`}
                  className={cn(buttonVariants({ size: "sm" }), "min-h-11")}
                >
                  회원권·결제로 이동
                </Link>
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
