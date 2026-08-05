import { MemberPortalAppShell } from "@/components/domain/gym-member-portal/MemberPortalAppShell";
import { MemberPortalClassesSchedule } from "@/components/domain/gym-member-portal/MemberPortalClassesSchedule";
import {
  getMonthCalendarFetchRange,
  getWeekRangeForDateKey,
  parseMemberPortalClassView,
  parseMemberPortalDateKey,
  seoulDateKeyParts,
} from "@/lib/gym-member-portal/class-calendar";
import { requireMemberPortalPageSession } from "@/lib/gym-member-portal/require-member-session";
import { gymMemberPortalService } from "@/lib/services/gym-member-portal.service";
import { toSeoulDateKey } from "@/lib/gym-schedule/seoul-schedule";

export const dynamic = "force-dynamic";

export default async function MemberPortalClassesPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const viewRaw = typeof sp.view === "string" ? sp.view : undefined;
  const dateRaw = typeof sp.date === "string" ? sp.date : undefined;
  const classIdRaw = typeof sp.classId === "string" ? sp.classId : null;

  const now = new Date();
  const view = parseMemberPortalClassView(viewRaw);
  const selectedDateKey = parseMemberPortalDateKey(dateRaw, now);
  const todayKey = toSeoulDateKey(now);

  const range =
    view === "week"
      ? (() => {
          const week = getWeekRangeForDateKey(selectedDateKey);
          return { from: week.start, toExclusive: week.endExclusive };
        })()
      : (() => {
          const { year, month } = seoulDateKeyParts(selectedDateKey);
          const monthRange = getMonthCalendarFetchRange(year, month);
          return {
            from: monthRange.start,
            toExclusive: monthRange.endExclusive,
          };
        })();

  const session = await requireMemberPortalPageSession(token);
  const [classes, myParts] = await Promise.all([
    gymMemberPortalService.listGroupClasses(session, range),
    gymMemberPortalService.listMyParticipations(session),
  ]);

  let mergedClasses = classes;
  let resolvedClassId: string | null = null;

  if (classIdRaw) {
    const inRange = classes.find((c) => c.id === classIdRaw);
    if (inRange) {
      resolvedClassId = classIdRaw;
    } else {
      const extra = await gymMemberPortalService.getGroupClass(
        session,
        classIdRaw,
      );
      if (extra) {
        mergedClasses = [...classes, extra];
        resolvedClassId = classIdRaw;
      }
    }
  }

  return (
    <MemberPortalAppShell token={token} gymName={session.gymName}>
      <MemberPortalClassesSchedule
        token={token}
        view={view}
        selectedDateKey={selectedDateKey}
        todayKey={todayKey}
        initialClassId={resolvedClassId}
        classes={mergedClasses}
        myParts={myParts}
      />
    </MemberPortalAppShell>
  );
}
