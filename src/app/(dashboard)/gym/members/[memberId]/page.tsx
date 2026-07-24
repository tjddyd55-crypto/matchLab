import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { PermissionError } from "@/lib/auth/permission-error";
import { formatPhoneNumber } from "@/lib/phone";
import { formatUtcDateOnly } from "@/lib/date-only";
import { formatWon } from "@/lib/format-won";
import { getGymMemberStoredStatusLabel } from "@/lib/gym-member-membership-status";
import { getSeoulYmdParts } from "@/lib/gym-attendance/seoul-date";
import { gymAttendanceService } from "@/lib/services/gym-attendance.service";
import { gymMemberService } from "@/lib/services/gym-member.service";
import { gymMembershipPlanService } from "@/lib/services/gym-membership-plan.service";
import { GymMemberAttendanceCalendar } from "@/components/domain/gym-attendance/GymMemberAttendanceCalendar";
import { GymMemberDetailActions } from "@/components/domain/gym-members/GymMemberDetailActions";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { buttonVariants } from "@/components/ui/button";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
  matchonSectionTitleClass,
} from "@/lib/ui/matchon-layout";
import { matchonCompactActionBarClass } from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-matchon-border py-2 text-sm last:border-0">
      <span className="text-matchon-text-secondary">{label}</span>
      <span className="text-right text-matchon-text-primary">{value}</span>
    </div>
  );
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
  try {
    [detail, plans, attendanceSummary, attendanceCalendar] = await Promise.all([
      gymMemberService.getMemberDetail(actor, memberId),
      gymMembershipPlanService.listPlans(actor, false),
      gymAttendanceService.getGymMemberAttendanceSummary(actor, memberId),
      gymAttendanceService.getGymMemberAttendanceCalendar(
        actor,
        memberId,
        calYear,
        calMonth,
      ),
    ]);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    if (e instanceof AppError && e.code === "FORBIDDEN") notFound();
    if (e instanceof PermissionError) notFound();
    throw e;
  }

  const { member, currentSubscription, membershipStatusLabel, expirationDisplay } =
    detail;
  const addressLine = [member.address, member.addressDetail]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <div className="min-w-0">
          <Link
            href="/gym/members"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 mb-2",
            )}
          >
            ← 전체 회원
          </Link>
          <h1 className={matchonPageTitleClass}>{member.name}</h1>
          <p className={cn(matchonPageDescClass, "font-mono text-xs")}>
            {member.memberNumber}
          </p>
        </div>

        <div className={matchonCompactActionBarClass}>
          <Link
            href={`/gym/members/${member.id}/edit`}
            className={cn(buttonVariants({ size: "sm" }))}
          >
            정보 수정
          </Link>
          {member.fighter ? (
            <Link
              href={`/gym/fighters/${member.fighter.id}/edit`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              선수 정보
            </Link>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <section className="rounded-xl border border-matchon-border bg-white p-4">
              <h2 className={cn(matchonSectionTitleClass, "mb-3")}>기본 정보</h2>
              <InfoRow
                label="상태"
                value={getGymMemberStoredStatusLabel(member.status)}
              />
              <InfoRow label="이용권 상태" value={membershipStatusLabel} />
              <InfoRow
                label="연락처"
                value={formatPhoneNumber(member.phone)}
              />
              <InfoRow
                label="생년월일"
                value={
                  member.birthDate
                    ? formatUtcDateOnly(member.birthDate)
                    : "—"
                }
              />
              <InfoRow label="성별" value={member.gender ?? "—"} />
              <InfoRow label="이메일" value={member.email ?? "—"} />
              <InfoRow
                label="등록일"
                value={
                  member.joinedAt ? formatUtcDateOnly(member.joinedAt) : "—"
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
              <InfoRow
                label="비상 연락처"
                value={
                  member.emergencyContactName || member.emergencyContactPhone
                    ? `${member.emergencyContactName ?? ""} ${
                        member.emergencyContactPhone
                          ? formatPhoneNumber(member.emergencyContactPhone)
                          : ""
                      }`.trim()
                    : "—"
                }
              />
              <InfoRow
                label="보호자"
                value={
                  member.guardianName || member.guardianPhone
                    ? `${member.guardianName ?? ""} ${
                        member.guardianPhone
                          ? formatPhoneNumber(member.guardianPhone)
                          : ""
                      }`.trim()
                    : "—"
                }
              />
              <InfoRow label="주 종목" value={member.primarySport ?? "—"} />
              <InfoRow label="등급/띠" value={member.rankName ?? "—"} />
              <InfoRow label="메모" value={member.memo ?? "—"} />
            </section>

            <section className="rounded-xl border border-matchon-border bg-white p-4">
              <h2 className={cn(matchonSectionTitleClass, "mb-3")}>이용권</h2>
              {currentSubscription ? (
                <>
                  <InfoRow
                    label="이용권"
                    value={currentSubscription.planNameSnapshot}
                  />
                  <InfoRow
                    label="상태"
                    value={currentSubscription.status}
                  />
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

            <section className="rounded-xl border border-matchon-border bg-white p-4">
              <h2 className={cn(matchonSectionTitleClass, "mb-3")}>결제</h2>
              {member.payments.length === 0 ? (
                <p className="text-sm text-matchon-text-secondary">
                  결제 기록이 없습니다.
                </p>
              ) : (
                <ul className="divide-y divide-matchon-border">
                  {member.payments.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">{formatWon(p.amount)}</p>
                        <p className="text-xs text-matchon-text-secondary">
                          {formatUtcDateOnly(p.paidAt)} · {p.paymentMethod} ·{" "}
                          {p.status}
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

            <GymMemberAttendanceCalendar
              memberId={member.id}
              memberName={member.name}
              year={attendanceCalendar.year}
              month={attendanceCalendar.month}
              days={attendanceCalendar.days}
              summary={attendanceSummary}
            />

            <section className="rounded-xl border border-matchon-border bg-white p-4">
              <h2 className={cn(matchonSectionTitleClass, "mb-3")}>선수</h2>
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
                      )}
                    >
                      선수 정보 수정
                    </Link>
                  </div>
                </>
              ) : (
                <p className="text-sm text-matchon-text-secondary">
                  아직 선수로 등록되지 않았습니다. 오른쪽에서 승격할 수
                  있습니다.
                </p>
              )}
            </section>
          </div>

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
        </div>
      </div>
    </div>
  );
}
