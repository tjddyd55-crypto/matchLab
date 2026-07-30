import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { AppError } from "@/lib/errors/app-error";
import { formatPhoneNumber } from "@/lib/phone";
import { gymStaffAccountSetupService } from "@/lib/services/gym-staff-account-setup.service";
import { gymStaffService } from "@/lib/services/gym-staff.service";
import { gymScheduleService } from "@/lib/services/gym-schedule.service";
import { GymStaffAccountPanel } from "@/components/domain/gym-staff/GymStaffAccountPanel";
import { GymStaffAssignmentPanel } from "@/components/domain/gym-staff/GymStaffAssignmentPanel";
import { GymStaffEditForm } from "@/components/domain/gym-staff/GymStaffEditForm";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { buttonVariants } from "@/components/ui/button";
import { toSeoulDateKey } from "@/lib/gym-schedule/seoul-schedule";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
  matchonSectionTitleClass,
} from "@/lib/ui/matchon-layout";
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

export default async function GymStaffDetailPage({
  params,
}: {
  params: Promise<{ staffId: string }>;
}) {
  const actor = await requireActor();
  const { staffId } = await params;

  if (!actor.gymId) {
    return (
      <div className={matchonPageContainerClass}>
        <div className={matchonPageStackClass}>
          <GymProfileMissingBanner />
        </div>
      </div>
    );
  }

  let detail;
  let accountState;
  let scheduleSnippet: Awaited<
    ReturnType<typeof gymScheduleService.getStaffUpcoming>
  > | null = null;
  try {
    [detail, accountState] = await Promise.all([
      gymStaffService.getStaffDetail(actor, staffId),
      gymStaffAccountSetupService.getPanelState(actor, staffId),
    ]);
    scheduleSnippet = await gymScheduleService
      .getStaffUpcoming(actor, staffId)
      .catch(() => null);
  } catch (e) {
    if (e instanceof PermissionError) notFound();
    if (
      e instanceof AppError &&
      (e.code === "NOT_FOUND" || e.code === "FORBIDDEN")
    ) {
      notFound();
    }
    throw e;
  }

  const { staff, assignments } = detail;

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <div className="min-w-0">
          <Link
            href="/gym/staff"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 mb-2",
            )}
          >
            ← 선생님 목록
          </Link>
          <h1 className={matchonPageTitleClass}>{staff.name}</h1>
          <p className={matchonPageDescClass}>
            {staff.staffRoleLabel}
            {staff.title ? ` · ${staff.title}` : ""}
            {staff.isActive ? "" : " · 퇴사"}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <section className="rounded-xl border border-matchon-border bg-white p-4">
              <h2 className={cn(matchonSectionTitleClass, "mb-3")}>기본 정보</h2>
              <InfoRow label="이름" value={staff.name} />
              <InfoRow label="직무" value={staff.staffRoleLabel} />
              <InfoRow label="직함" value={staff.title ?? "—"} />
              <InfoRow
                label="연락처"
                value={formatPhoneNumber(staff.phone)}
              />
              <InfoRow label="이메일" value={staff.email ?? "—"} />
              <InfoRow
                label="재직 상태"
                value={staff.isActive ? "재직" : "퇴사"}
              />
            </section>

            <section className="rounded-xl border border-matchon-border bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className={matchonSectionTitleClass}>일정</h2>
                <div className="flex gap-2">
                  <Link
                    href={`/gym/schedules?staffId=${staff.id}&view=week`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    일정 보기
                  </Link>
                  <Link
                    href={`/gym/schedules?staffId=${staff.id}&view=day&date=${toSeoulDateKey(new Date())}`}
                    className={cn(buttonVariants({ size: "sm" }))}
                  >
                    일정 등록
                  </Link>
                </div>
              </div>
              {scheduleSnippet ? (
                <div className="space-y-2 text-sm">
                  <InfoRow
                    label="오늘 일정"
                    value={`${scheduleSnippet.today.length}건`}
                  />
                  <InfoRow
                    label="이번 주 예정"
                    value={`${scheduleSnippet.scheduledCount}건`}
                  />
                  <InfoRow
                    label="다음 일정"
                    value={
                      scheduleSnippet.next
                        ? `${scheduleSnippet.next.dateKey} ${scheduleSnippet.next.timeRangeLabel} · ${scheduleSnippet.next.memberName}`
                        : "—"
                    }
                  />
                  <InfoRow
                    label="담당 회원"
                    value={`${assignments.length}명`}
                  />
                </div>
              ) : (
                <p className="text-sm text-matchon-text-secondary">
                  일정 정보를 불러올 수 없습니다.
                </p>
              )}
            </section>

            <section className="rounded-xl border border-matchon-border bg-white p-4">
              <h2 className={cn(matchonSectionTitleClass, "mb-3")}>정보 수정</h2>
              <GymStaffEditForm
                staffId={staff.id}
                isActive={staff.isActive}
                initial={{
                  name: staff.name,
                  phone: staff.phone,
                  email: staff.email,
                  staffRole: staff.staffRole,
                  title: staff.title,
                  colorKey: null,
                }}
              />
            </section>

            <section className="rounded-xl border border-matchon-border bg-white p-4">
              <h2 className={cn(matchonSectionTitleClass, "mb-3")}>
                담당 회원 ({assignments.length}명)
              </h2>
              <GymStaffAssignmentPanel
                staffId={staff.id}
                assignments={assignments.map((assignment) => ({
                  id: assignment.id,
                  gymMemberId: assignment.gymMemberId,
                  memberName: assignment.memberName,
                  memberNumber: assignment.memberNumber,
                  assignmentTypeLabel: assignment.assignmentTypeLabel,
                  isPrimary: assignment.isPrimary,
                }))}
              />
            </section>
          </div>

          <div className="space-y-6">
            <GymStaffAccountPanel
              staffId={staff.id}
              loginId={accountState.loginId}
              hasAccount={accountState.hasAccount}
              statusKind={accountState.statusKind}
              activeSetupExpiresAt={accountState.activeSetupExpiresAt}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
