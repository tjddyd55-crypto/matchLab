import { MemberPortalAppShell } from "@/components/domain/gym-member-portal/MemberPortalAppShell";
import { MemberPortalClassesCalendarApp } from "@/components/domain/gym-member-portal/MemberPortalClassesCalendarApp";
import { requireMemberPortalPageSession } from "@/lib/gym-member-portal/require-member-session";
import {
  parsePortalYearMonth,
  resolvePortalSelectedDateKey,
} from "@/lib/gym-member-portal/portal-month-calendar";
import { toSeoulDateKey } from "@/lib/gym-schedule/seoul-schedule";
import { gymMemberPortalService } from "@/lib/services/gym-member-portal.service";

export const dynamic = "force-dynamic";

export default async function MemberPortalClassesPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ year?: string; month?: string; date?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const session = await requireMemberPortalPageSession(token);
  const todayKey = toSeoulDateKey(new Date());
  const { year, month } = parsePortalYearMonth(query.year, query.month);
  const selectedDateKey = resolvePortalSelectedDateKey({
    dateRaw: query.date,
    year,
    month,
    todayKey,
  });

  const [classes, myParts] = await Promise.all([
    gymMemberPortalService.listGroupClassesByMonth(session, year, month),
    gymMemberPortalService.listMyParticipations(session),
  ]);

  const myActiveCount = myParts.filter(
    (p) => p.bucket === "attending" || p.bucket === "waitlisted",
  ).length;

  return (
    <MemberPortalAppShell token={token} gymName={session.gymName}>
      <MemberPortalClassesCalendarApp
        token={token}
        year={year}
        month={month}
        selectedDateKey={selectedDateKey}
        todayKey={todayKey}
        classes={classes}
        myActiveCount={myActiveCount}
      />
    </MemberPortalAppShell>
  );
}
