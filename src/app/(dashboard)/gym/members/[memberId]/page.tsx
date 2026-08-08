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
import { gymMembershipPlanService } from "@/lib/services/gym-membership-plan.service";
import { gymMemberLockerService } from "@/lib/services/gym-member-locker.service";
import { gymMemberGroupService } from "@/lib/services/gym-member-group.service";
import { gymSalesService } from "@/lib/services/gym-sales.service";
import { GymMemberAttendanceCalendar } from "@/components/domain/gym-attendance/GymMemberAttendanceCalendar";
import { GymMemberAvatar } from "@/components/domain/gym-members/GymMemberAvatar";
import { GymMemberAssignedStaffSection } from "@/components/domain/gym-members/GymMemberAssignedStaffSection";
import { GymMemberUpcomingSchedulesSection } from "@/components/domain/gym-members/GymMemberUpcomingSchedulesSection";
import { GymMemberDetailActions } from "@/components/domain/gym-members/GymMemberDetailActions";
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
import { MemberSummaryCard } from "@/components/domain/gym-members/MemberSummaryCard";
import {
  matchonPageContainerClass,
  matchonPageStackClass,
  matchonSectionTitleClass,
} from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-matchon-border py-2 text-sm last:border-0">
      <span className="text-matchon-text-secondary">{label}</span>
      <span className="max-w-[70%] text-right text-matchon-text-primary break-words">
        {value}
      </span>
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

  const detailActions = (
    <GymMemberDetailActions
      memberId={member.id}
      memberStatus={member.status}
      hasFighter={Boolean(member.fighter)}
      currentSubscriptionId={currentSubscription?.id ?? null}
      plans={plans.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
      }))}
      subscriptions={member.subscriptions.map((s) => ({
        id: s.id,
        planNameSnapshot: s.planNameSnapshot,
        status: s.status,
      }))}
      payments={member.payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        paymentMethod: p.paymentMethod,
        paidAt: p.paidAt,
        memo: p.memo,
      }))}
      defaultPrimarySport={member.primarySport}
    />
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

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <GymMemberAvatar
                src={detail.profileImageUrl}
                name={member.name}
                className="size-14 shrink-0 sm:size-16"
              />
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-[22px] font-bold tracking-tight text-matchon-text-primary">
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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MemberSummaryCard
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
              <MemberSummaryCard
                label="다음 PT"
                value={nextPt.timeRangeLabel}
                hint={`${nextPt.scheduleTypeLabel} · ${nextPt.staffName}`}
              />
            ) : null}
            {nextGroup ? (
              <MemberSummaryCard
                label="다음 그룹수업"
                value={nextGroup.title}
                hint={nextGroup.timeRangeLabel}
              />
            ) : null}
            {latestPayment ? (
              <MemberSummaryCard
                label="최근 결제"
                value={formatWon(latestPayment.amount)}
                hint={`${formatUtcDateOnly(latestPayment.paidAt)} · ${latestPayment.paymentMethodLabel} · ${latestPayment.status}`}
              />
            ) : salesSummary ? (
              <MemberSummaryCard label="최근 결제" value="결제 기록 없음" />
            ) : null}
          </div>
        ) : null}

        <MemberDetailTabs
          memberId={member.id}
          active={tab}
          extraQuery={attendanceQs}
        />

        {tab === "overview" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-[10px] border border-matchon-border bg-white p-4">
              <h2 className={cn(matchonSectionTitleClass, "mb-3 text-sm")}>
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

            <section className="rounded-[10px] border border-matchon-border bg-white p-4">
              <h2 className={cn(matchonSectionTitleClass, "mb-3 text-sm")}>
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
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <section className="rounded-[10px] border border-matchon-border bg-white p-4">
                <h2 className={cn(matchonSectionTitleClass, "mb-3")}>이용권</h2>
                {currentSubscription ? (
                  <>
                    <InfoRow
                      label="이용권"
                      value={currentSubscription.planNameSnapshot}
                    />
                    <InfoRow label="상태" value={currentSubscription.status} />
                    <InfoRow
                      label="시작"
                      value={formatUtcDateOnly(currentSubscription.startedAt)}
                    />
                    <InfoRow
                      label="종료"
                      value={
                        currentSubscription.endsAt
                          ? `${formatUtcDateOnly(currentSubscription.endsAt)} (${expirationDisplay})`
                          : "—"
                      }
                    />
                    <InfoRow
                      label="가격"
                      value={formatWon(currentSubscription.priceSnapshot)}
                    />
                  </>
                ) : (
                  <p className="text-sm text-matchon-text-secondary">
                    배정된 이용권이 없습니다.
                  </p>
                )}

                {member.subscriptions.length > 1 ? (
                  <div className="mt-4 space-y-2 border-t border-matchon-border pt-3">
                    <p className="text-xs font-medium text-matchon-text-secondary">
                      이력
                    </p>
                    <ul className="space-y-1 text-sm">
                      {member.subscriptions.map((s) => (
                        <li key={s.id} className="text-matchon-text-secondary">
                          {s.planNameSnapshot} · {s.status}
                          {s.endsAt
                            ? ` · ${formatUtcDateOnly(s.endsAt)}`
                            : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>

              {salesSummary ? (
                <section className="rounded-[10px] border border-matchon-border bg-white p-4">
                  <h2 className={cn(matchonSectionTitleClass, "mb-3")}>결제</h2>
                  <div className="mb-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-matchon-text-secondary">
                        총 결제
                      </p>
                      <p className="font-medium">
                        {formatWon(salesSummary.grossPaid)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-matchon-text-secondary">
                        총 환불
                      </p>
                      <p className="font-medium">
                        {formatWon(salesSummary.refundTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-matchon-text-secondary">
                        미수금
                      </p>
                      <p className="font-medium">
                        {formatWon(salesSummary.outstanding)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-matchon-text-secondary">
                        최근 결제
                      </p>
                      <p className="font-medium">
                        {salesSummary.latestPaidAt
                          ? formatUtcDateOnly(salesSummary.latestPaidAt)
                          : "—"}
                      </p>
                    </div>
                  </div>
                  {salesSummary.payments.length === 0 ? (
                    <p className="text-sm text-matchon-text-secondary">
                      결제 기록이 없습니다.
                    </p>
                  ) : (
                    <ul className="divide-y divide-matchon-border">
                      {salesSummary.payments.map((p) => (
                        <li
                          key={p.id}
                          className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                        >
                          <div>
                            <p className="font-medium">
                              {formatWon(p.amount)}
                            </p>
                            <p className="text-xs text-matchon-text-secondary">
                              {formatUtcDateOnly(p.paidAt)} ·{" "}
                              {p.paymentMethodLabel} · {p.status}
                              {p.categoryLabel ? ` · ${p.categoryLabel}` : ""}
                            </p>
                          </div>
                          {p.memo ? (
                            <p className="text-xs text-matchon-text-secondary">
                              {p.memo}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : null}
            </div>
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
