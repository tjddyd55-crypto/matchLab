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
import { gymMemberProfileService } from "@/lib/services/gym-member-profile.service";
import { gymSalesService } from "@/lib/services/gym-sales.service";
import { gymMembershipSaleService } from "@/lib/services/gym-membership-sale.service";
import { GymMemberAttendanceCalendar } from "@/components/domain/gym-attendance/GymMemberAttendanceCalendar";
import { GymMemberAvatar } from "@/components/domain/gym-members/GymMemberAvatar";
import { GymMemberAssignedStaffSection } from "@/components/domain/gym-members/GymMemberAssignedStaffSection";
import { GymMemberCommonDetailSection } from "@/components/domain/gym-members/GymMemberCommonDetailSection";
import { GymMemberProfileDetailSections } from "@/components/domain/gym-members/GymMemberProfileDetailSections";
import { GymMemberUpcomingSchedulesSection } from "@/components/domain/gym-members/GymMemberUpcomingSchedulesSection";
import { GymMemberDetailActions } from "@/components/domain/gym-members/GymMemberDetailActions";
import { GymMemberFighterOverviewSection } from "@/components/domain/gym-members/GymMemberFighterOverviewSection";
import { GymMemberMembershipPanel } from "@/components/domain/gym-members/GymMemberMembershipPanel";
import { GymMemberOpsActionBar } from "@/components/domain/gym-members/GymMemberOpsActionBar";
import { GymMemberLockerPanel } from "@/components/domain/gym-members/GymMemberLockerPanel";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { buttonVariants } from "@/components/ui/button";
import { resolveGymPortalAccess } from "@/lib/gym-portal-access";
import { GymMemberGroupClassesSection } from "@/components/domain/gym-group-classes/GymMemberGroupClassesSection";
import { gymGroupClassService } from "@/lib/services/gym-group-class.service";
import { gymScheduleService } from "@/lib/services/gym-schedule.service";
import { gymStaffService } from "@/lib/services/gym-staff.service";
import { gymProductService } from "@/lib/services/gym-product.service";
import { gymProductCategoryLabel } from "@/lib/gym-products/labels";
import { formatSeoulDateTime } from "@/lib/gym-attendance/seoul-date";
import { GymMemberSubscriptionStatus } from "@/lib/enums";
import { MemberAlert } from "@/components/domain/gym-members/MemberAlert";
import { MemberCopyPhoneButton } from "@/components/domain/gym-members/MemberCopyPhoneButton";
import {
  MemberDetailTabs,
  type MemberDetailTabId,
} from "@/components/domain/gym-members/MemberDetailTabs";
import { MemberStatusBadge } from "@/components/domain/gym-members/MemberStatusBadge";
import { memberSportTemplateDisplayName } from "@/lib/gym-member-profile/display-name";
import { fighterUnifiedProfileService } from "@/lib/services/fighter-unified-profile.service";
import { prisma } from "@/lib/prisma";
import {
  matchonPageContainerClass,
  matchonSectionTitleClass,
} from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

const SUBSCRIPTION_STATUS_LABEL: Record<string, string> = {
  [GymMemberSubscriptionStatus.active]: "사용 중",
  [GymMemberSubscriptionStatus.paused]: "일시정지",
  [GymMemberSubscriptionStatus.ended]: "종료",
  [GymMemberSubscriptionStatus.cancelled]: "취소",
};

function subscriptionStatusLabel(status: string): string {
  return SUBSCRIPTION_STATUS_LABEL[status] ?? status;
}

function parseMembershipOp(
  raw: unknown,
): "sale" | "renew" | "collect" | null {
  if (raw === "sale" || raw === "renew" || raw === "collect") return raw;
  return null;
}

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
    raw === "participation"
  ) {
    return raw;
  }
  // Legacy ?tab=fighter → overview (선수 정보는 개요로 흡수)
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
  const membershipOp = parseMembershipOp(
    typeof sp.op === "string" ? sp.op : undefined,
  );

  if (!actor.gymId) {
    return (
      <div className={matchonPageContainerClass}>
        <GymProfileMissingBanner />
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
  let profileCtx: Awaited<
    ReturnType<typeof gymMemberProfileService.getMemberProfileContext>
  > | null = null;
  let products: Awaited<
    ReturnType<typeof gymProductService.listProducts>
  > = [];
  let gymName = "";
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
      profileCtx,
      products,
      gymName,
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
      gymMemberProfileService
        .getMemberProfileContext(actor, memberId)
        .catch(() => null),
      access?.canManageSales
        ? gymProductService
            .listProducts(actor, { activeOnly: true })
            .catch(() => [])
        : Promise.resolve([]),
      prisma.gym
        .findUnique({
          where: { id: actor.gymId! },
          select: { name: true },
        })
        .then((g) => g?.name ?? "")
        .catch(() => ""),
    ]);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    if (e instanceof AppError && e.code === "FORBIDDEN") notFound();
    if (e instanceof PermissionError) notFound();
    throw e;
  }

  const selfRegistrationDocument =
    await gymMemberSelfRegistrationService.getDocumentForMember(
      actor,
      memberId,
    );

  const {
    member,
    currentSubscription,
    membershipStatus,
    membershipStatusLabel,
    expirationDisplay,
    daysRemaining,
  } = detail;
  const alert = membershipAlert(membershipStatus, expirationDisplay);
  const latestPayment = salesSummary?.payments[0];
  const recentPayments = salesSummary?.payments.slice(0, 5) ?? [];
  const recentAttendance = [...attendanceCalendar.days]
    .sort(
      (a, b) =>
        new Date(b.attendedAt).getTime() - new Date(a.attendedAt).getTime(),
    )
    .slice(0, 5);
  const canWriteMembers = Boolean(access?.canWriteMembers);
  const canManageSales = Boolean(access?.canManageSales);
  const productOptions = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    categoryLabel: gymProductCategoryLabel(p.category),
    defaultPrice: p.defaultPrice,
  }));
  const salesDrilldownHref = `/gym/sales?memberNameQ=${encodeURIComponent(member.name)}`;

  const attendanceQs: Record<string, string | undefined> = {
    attendanceYear:
      typeof sp.attendanceYear === "string" ? sp.attendanceYear : undefined,
    attendanceMonth:
      typeof sp.attendanceMonth === "string" ? sp.attendanceMonth : undefined,
  };

  const sportOptions =
    profileCtx?.sportTemplates.map((t) => ({
      id: t.id,
      label: memberSportTemplateDisplayName(t),
    })) ?? [];
  const preferredSportLabel = (() => {
    if (member.primarySport?.trim()) return member.primarySport.trim();
    const activeIds = new Set(profileCtx?.memberActiveTemplateIds ?? []);
    const activeTpl = profileCtx?.sportTemplates.find((t) =>
      activeIds.has(t.id),
    );
    if (activeTpl) return memberSportTemplateDisplayName(activeTpl);
    return sportOptions[0]?.label ?? "";
  })();

  let fighterOverview = null as null | {
    id: string;
    fighterCode: string;
    name: string;
    status: string;
    primarySport: string | null;
    height: number | null;
    weight: number | null;
    gymName: string;
    officialRecord: Awaited<
      ReturnType<typeof fighterUnifiedProfileService.loadCareerBreakdown>
    >["officialRecord"];
    externalRecord: Awaited<
      ReturnType<typeof fighterUnifiedProfileService.loadCareerBreakdown>
    >["externalRecord"];
    combinedRecord: Awaited<
      ReturnType<typeof fighterUnifiedProfileService.loadCareerBreakdown>
    >["combinedRecord"];
  };
  if (member.fighter) {
    const career = await fighterUnifiedProfileService.loadCareerBreakdown(
      member.fighter.id,
    );
    fighterOverview = {
      id: member.fighter.id,
      fighterCode: member.fighter.fighterCode,
      name: member.name,
      status: member.fighter.status,
      primarySport: member.fighter.primarySport,
      height: member.fighter.height,
      weight: member.fighter.weight,
      gymName,
      officialRecord: career.officialRecord,
      externalRecord: career.externalRecord,
      combinedRecord: career.combinedRecord,
    };
  }

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
    <GymMemberDetailActions
      memberId={member.id}
      memberStatus={member.status}
    />
  );

  return (
    <div
      className={cn(
        matchonPageContainerClass,
        "bg-matchon-surface py-3 md:py-4",
      )}
    >
      <div className="mx-0 flex w-full max-w-[78rem] flex-col gap-3">
        <header className="min-w-0 space-y-1.5">
          <Link
            href="/gym/members"
            className="inline-flex min-h-8 items-center text-xs font-medium text-matchon-text-secondary hover:text-matchon-primary"
          >
            ← 회원 목록
          </Link>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-2.5">
              <GymMemberAvatar
                src={detail.profileImageUrl}
                name={member.name}
                className="size-9 shrink-0 sm:size-10"
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
                <p className="text-xs text-matchon-text-secondary">
                  {formatPhoneNumber(member.phone)}
                  <span className="mx-1.5 text-matchon-border">·</span>
                  <span className="font-mono">{member.memberNumber}</span>
                  {member.joinedAt ? (
                    <>
                      <span className="mx-1.5 text-matchon-border">·</span>
                      등록 {formatUtcDateOnly(member.joinedAt)}
                    </>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <GymMemberOpsActionBar
                memberId={member.id}
                memberName={member.name}
                canWriteMembers={canWriteMembers}
                canManageSales={canManageSales}
                products={productOptions}
                selfRegistrationHref={
                  selfRegistrationDocument
                    ? `/gym/members/registrations/${selfRegistrationDocument.id}`
                    : null
                }
              />
              <MemberCopyPhoneButton phone={formatPhoneNumber(member.phone)} />
            </div>
          </div>
        </header>

        {alert ? <MemberAlert tone={alert.tone}>{alert.text}</MemberAlert> : null}

        {tab === "overview" ? (
          <section className="rounded-md border border-matchon-border bg-white">
            <div className="grid gap-0 sm:grid-cols-2">
              <OverviewStat
                label="현재 회원권"
                value={currentSubscription?.planNameSnapshot ?? "회원권 없음"}
                hint={
                  currentSubscription
                    ? daysRemaining != null && daysRemaining >= 0
                      ? `D-${daysRemaining}`
                      : expirationDisplay
                    : undefined
                }
              />
              {latestPayment ? (
                <OverviewStat
                  label="최근 결제"
                  value={formatWon(latestPayment.amount)}
                  hint={formatUtcDateOnly(latestPayment.paidAt)}
                />
              ) : (
                <OverviewStat label="최근 결제" value="결제 기록 없음" />
              )}
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
            <div className="lg:col-span-2 space-y-4">
              <GymMemberCommonDetailSection
                member={{
                  name: member.name,
                  phone: member.phone,
                  birthDate: member.birthDate,
                  gender: member.gender,
                  email: member.email,
                  postalCode: member.postalCode,
                  address: member.address,
                  addressDetail: member.addressDetail,
                  joinedAt: member.joinedAt,
                  memberNumber: member.memberNumber,
                  rankName: member.rankName,
                  guardianName: member.guardianName,
                  guardianPhone: member.guardianPhone,
                  emergencyContactName: member.emergencyContactName,
                  emergencyContactPhone: member.emergencyContactPhone,
                  memo: member.memo,
                  smsOptOut: member.smsOptOut,
                  statusLabel: getGymMemberStoredStatusLabel(member.status),
                }}
              />

              <GymMemberFighterOverviewSection
                memberId={member.id}
                memberName={member.name}
                gymName={gymName}
                birthDate={member.birthDate}
                genderLabel={member.gender}
                canWrite={canWriteMembers}
                hasFighter={Boolean(member.fighter)}
                fighter={fighterOverview}
                defaultPrimarySport={preferredSportLabel}
                sportOptions={sportOptions}
              />

              {profileCtx ? (
                <GymMemberProfileDetailSections
                  sportTemplates={profileCtx.sportTemplates}
                  customFields={profileCtx.customFields}
                  sportValuesByTemplate={profileCtx.sportValuesByTemplate}
                  gymValues={profileCtx.gymValues}
                />
              ) : null}

              {memberGroups.length > 0 ? (
                <section className="space-y-2">
                  <h2 className={cn(matchonSectionTitleClass, "text-sm")}>
                    회원 그룹
                  </h2>
                  <div className="border-b border-matchon-border" />
                  <InfoRow
                    label="그룹"
                    value={memberGroups.map((a) => a.group.name).join(", ")}
                  />
                </section>
              ) : null}
            </div>

            <section className="rounded-[10px] border border-matchon-border bg-white p-3">
              <h2 className={cn(matchonSectionTitleClass, "mb-2 text-xs")}>
                현재 이용권
              </h2>
              {currentSubscription ? (
                <>
                  <InfoRow
                    label="상품"
                    value={currentSubscription.planNameSnapshot}
                  />
                  <InfoRow
                    label="상태"
                    value={membershipStatusLabel}
                  />
                  <InfoRow
                    label="이용권 상태"
                    value={subscriptionStatusLabel(currentSubscription.status)}
                  />
                  <InfoRow
                    label="기간"
                    value={`${formatUtcDateOnly(currentSubscription.startedAt)}${
                      currentSubscription.endsAt
                        ? ` – ${formatUtcDateOnly(currentSubscription.endsAt)}`
                        : ""
                    }`}
                  />
                  <InfoRow
                    label="잔여"
                    value={
                      daysRemaining != null
                        ? daysRemaining >= 0
                          ? `${daysRemaining}일 남음`
                          : `${Math.abs(daysRemaining)}일 지남`
                        : expirationDisplay
                    }
                  />
                  <div className="flex flex-wrap gap-2 pt-3">
                    <Link
                      href={`/gym/members/${member.id}?tab=membership`}
                      className={cn(buttonVariants({ size: "sm" }), "min-h-9")}
                    >
                      회원권·결제 관리
                    </Link>
                    {canWriteMembers ? (
                      <Link
                        href={`/gym/members/${member.id}?tab=membership&op=sale`}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "min-h-9",
                        )}
                      >
                        이용권 등록
                      </Link>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-matchon-text-secondary">
                    배정된 이용권이 없습니다.
                  </p>
                  {canWriteMembers ? (
                    <Link
                      href={`/gym/members/${member.id}?tab=membership&op=sale`}
                      className={cn(buttonVariants({ size: "sm" }), "min-h-9")}
                    >
                      이용권 등록
                    </Link>
                  ) : null}
                </div>
              )}
            </section>

            <section className="rounded-[10px] border border-matchon-border bg-white p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className={cn(matchonSectionTitleClass, "text-xs")}>
                  결제 내역
                </h2>
                {canManageSales ? (
                  <Link
                    href={salesDrilldownHref}
                    className="text-[11px] font-medium text-matchon-primary"
                  >
                    전체 보기
                  </Link>
                ) : null}
              </div>
              {recentPayments.length === 0 ? (
                <p className="text-xs text-matchon-text-secondary">
                  결제 기록이 없습니다.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {recentPayments.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-baseline justify-between gap-2 border-b border-matchon-border py-1.5 text-xs last:border-0"
                    >
                      <span className="text-matchon-text-secondary">
                        {formatUtcDateOnly(p.paidAt)}
                        <span className="mx-1">·</span>
                        {p.categoryLabel ?? "결제"}
                      </span>
                      <span className="font-medium text-matchon-text-primary">
                        {formatWon(p.amount)}
                        <span className="ml-1 font-normal text-matchon-text-secondary">
                          {p.paymentMethodLabel}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-[10px] border border-matchon-border bg-white p-3 lg:col-span-2">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className={cn(matchonSectionTitleClass, "text-xs")}>
                  최근 출석
                </h2>
                <a
                  href="#attendance"
                  className="text-[11px] font-medium text-matchon-primary"
                >
                  출석 달력
                </a>
              </div>
              {recentAttendance.length === 0 ? (
                <p className="text-xs text-matchon-text-secondary">
                  이번 달 출석 기록이 없습니다.
                  {attendanceSummary.latestAttendedAt
                    ? ` · 최근 ${formatSeoulDateTime(attendanceSummary.latestAttendedAt)}`
                    : ""}
                </p>
              ) : (
                <ul className="space-y-1">
                  {recentAttendance.map((row) => (
                    <li
                      key={row.id}
                      className="border-b border-matchon-border py-1.5 text-xs text-matchon-text-primary last:border-0"
                    >
                      {formatSeoulDateTime(row.attendedAt)}
                      {row.membershipStatusLabel ? (
                        <span className="ml-2 text-matchon-text-secondary">
                          · {row.membershipStatusLabel}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
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

            <div className="lg:col-span-2" id="attendance">
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
              daysRemaining={daysRemaining}
              initialOp={membershipOp}
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
      </div>
    </div>
  );
}
