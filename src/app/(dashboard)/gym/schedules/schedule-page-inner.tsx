import { requireActor } from "@/lib/auth/actor";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { GymScheduleCalendarApp } from "@/components/domain/gym-schedules/GymScheduleCalendarApp";
import { resolveGymPortalAccess } from "@/lib/gym-portal-access";
import { toSeoulDateKey } from "@/lib/gym-schedule/seoul-schedule";
import { gymScheduleService } from "@/lib/services/gym-schedule.service";
import { gymStaffService } from "@/lib/services/gym-staff.service";
import { gymMemberService } from "@/lib/services/gym-member.service";
import { prisma } from "@/lib/prisma";
import { formatPhoneNumber } from "@/lib/phone";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";

export const dynamic = "force-dynamic";

export async function SchedulePageInner({
  searchParams,
  myOnly,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  myOnly: boolean;
}) {
  const actor = await requireActor();
  if (!actor.gymId) {
    return (
      <div className={matchonPageContainerClass}>
        <div className={matchonPageStackClass}>
          <GymProfileMissingBanner />
        </div>
      </div>
    );
  }

  const access = await resolveGymPortalAccess(actor);
  const isOwner = access.isOwner || actor.role === "admin";
  const sp = await searchParams;
  const viewRaw = typeof sp.view === "string" ? sp.view : "";
  const view =
    viewRaw === "month" || viewRaw === "week" || viewRaw === "day"
      ? viewRaw
      : actor.role === "gym_staff"
        ? "day"
        : "week";
  const dateKey =
    typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date)
      ? sp.date
      : toSeoulDateKey(new Date());
  const staffIdParam = typeof sp.staffId === "string" ? sp.staffId : null;
  const status = typeof sp.status === "string" ? sp.status : "active";

  const forceMyOnly = myOnly || !isOwner;
  const calendar = await gymScheduleService.getCalendar(actor, {
    view,
    dateKey,
    gymStaffId: forceMyOnly ? access.gymStaffId : staffIdParam,
    status,
    myOnly: forceMyOnly,
  });
  const summary = await gymScheduleService.getSummary(actor, {
    myOnly: forceMyOnly,
  });

  let staffOptions: Array<{
    id: string;
    name: string;
    title: string | null;
    colorKey: string | null;
  }> = [];
  if (isOwner) {
    const listed = await gymStaffService.listStaff(actor, {
      includeInactive: false,
      pageSize: 100,
    });
    const colors = await prisma.gymStaff.findMany({
      where: { gymId: access.gymId, deletedAt: null },
      select: { id: true, colorKey: true },
    });
    const colorMap = new Map(colors.map((c) => [c.id, c.colorKey]));
    staffOptions = listed.items.map((s) => ({
      id: s.id,
      name: s.name,
      title: s.title,
      colorKey: colorMap.get(s.id) ?? null,
    }));
  } else if (access.gymStaffId) {
    const self = await prisma.gymStaff.findFirst({
      where: { id: access.gymStaffId, gymId: access.gymId },
      select: { id: true, name: true, title: true, colorKey: true },
    });
    if (self) staffOptions = [self];
  }

  const membersPage = await gymMemberService.listMembers(actor, {
    pageSize: 100,
  });
  const assignments = await prisma.gymStaffMemberAssignment.findMany({
    where: {
      gymId: access.gymId,
      deletedAt: null,
      endedAt: null,
      isPrimary: true,
    },
    select: {
      gymMemberId: true,
      gymStaff: { select: { name: true } },
    },
  });
  const primaryByMember = new Map(
    assignments.map((a) => [a.gymMemberId, a.gymStaff.name]),
  );

  const memberOptions = membersPage.items.map((m) => ({
    id: m.id,
    name: m.name,
    memberNumber: m.memberNumber,
    phoneMasked: (() => {
      const digits = m.phone.replace(/\D/g, "");
      return digits.length >= 4
        ? `***-****-${digits.slice(-4)}`
        : formatPhoneNumber(m.phone);
    })(),
    status: m.status,
    profileImageUrl: m.profileImageUrl,
    primaryStaffName: primaryByMember.get(m.id) ?? null,
    planLabel: m.planName
      ? `${m.planName} · ${m.membershipStatusLabel}`
      : m.membershipStatusLabel,
  }));

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <div className="min-w-0 space-y-1">
          <h1 className={matchonPageTitleClass}>
            {forceMyOnly ? "내 일정" : "일정 관리"}
          </h1>
          <p className={matchonPageDescClass}>
            {forceMyOnly
              ? "내 개인 PT 일정과 회원 예약을 확인합니다."
              : "선생님별 개인 PT 일정과 회원 예약을 확인할 수 있습니다."}
          </p>
        </div>
        <GymScheduleCalendarApp
          initialItems={calendar.items}
          summary={summary}
          staffOptions={staffOptions}
          memberOptions={memberOptions}
          viewer={isOwner ? "owner" : "staff"}
          fixedStaffId={forceMyOnly ? access.gymStaffId : null}
          myOnly={forceMyOnly}
          defaultStaffId={access.gymStaffId ?? staffOptions[0]?.id ?? null}
        />
      </div>
    </div>
  );
}
