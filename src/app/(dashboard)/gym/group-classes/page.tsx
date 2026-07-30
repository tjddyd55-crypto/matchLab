import { requireActor } from "@/lib/auth/actor";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import {
  GymGroupClassListApp,
  type SerializableGymGroupClassVM,
} from "@/components/domain/gym-group-classes/GymGroupClassListApp";
import { resolveGymPortalAccess } from "@/lib/gym-portal-access";
import {
  createSeoulDateTime,
  getSeoulDayRange,
  getSeoulScheduleMonthRange,
  getSeoulScheduleWeekRange,
  getSeoulYmdParts,
  toSeoulDateKey,
} from "@/lib/gym-schedule/seoul-schedule";
import { gymGroupClassService } from "@/lib/services/gym-group-class.service";
import { gymStaffService } from "@/lib/services/gym-staff.service";
import { prisma } from "@/lib/prisma";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";

export const dynamic = "force-dynamic";

function serializeClass(
  vm: Awaited<ReturnType<typeof gymGroupClassService.listClasses>>[number],
): SerializableGymGroupClassVM {
  const { startsAt, endsAt, ...rest } = vm;
  void startsAt;
  void endsAt;
  return rest;
}

function resolveRange(view: "month" | "week" | "day", dateKey: string) {
  const at = createSeoulDateTime(dateKey, "12:00");
  if (view === "month") {
    const { year, month } = getSeoulYmdParts(at);
    const m = getSeoulScheduleMonthRange(year, month);
    return { rangeStart: m.start, rangeEndExclusive: m.endExclusive };
  }
  if (view === "week") {
    const w = getSeoulScheduleWeekRange(at);
    return { rangeStart: w.start, rangeEndExclusive: w.endExclusive };
  }
  const d = getSeoulDayRange(dateKey);
  return { rangeStart: d.start, rangeEndExclusive: d.endExclusive };
}

export default async function GymGroupClassesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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
  const titleQuery = typeof sp.q === "string" ? sp.q : null;

  const { rangeStart, rangeEndExclusive } = resolveRange(view, dateKey);

  const classes = await gymGroupClassService.listClasses(actor, {
    rangeStart,
    rangeEndExclusive,
    instructorStaffId: isOwner ? staffIdParam : staffIdParam,
    status:
      status === "all" || status === "active"
        ? null
        : (status as "scheduled" | "completed" | "cancelled"),
    titleQuery,
    myOnly: false,
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

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <div className="min-w-0 space-y-1">
          <h1 className={matchonPageTitleClass}>그룹수업</h1>
          <p className={matchonPageDescClass}>
            체육관 그룹 운동 일정과 참석자를 관리할 수 있습니다.
          </p>
        </div>
        <GymGroupClassListApp
          initialClasses={classes.map(serializeClass)}
          staffOptions={staffOptions}
          viewer={isOwner ? "owner" : "staff"}
          fixedStaffId={isOwner ? null : access.gymStaffId}
          defaultStaffId={access.gymStaffId ?? staffOptions[0]?.id ?? null}
        />
      </div>
    </div>
  );
}
