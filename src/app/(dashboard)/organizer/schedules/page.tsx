import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { AssociationScheduleCalendarApp } from "@/components/domain/association-schedules/AssociationScheduleCalendarApp";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { parseMemberPortalDateKey } from "@/lib/gym-member-portal/class-calendar";
import { requireAssociationOrganizerPage } from "@/lib/permissions";
import { associationScheduleService } from "@/lib/services/association-schedule.service";

export const dynamic = "force-dynamic";

export default async function OrganizerSchedulesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: string; date?: string }>;
}) {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["organizer", "admin"]);
  requireAssociationOrganizerPage(actor);
  const sp = await searchParams;
  const view = sp.view === "week" ? "week" : "month";
  const anchorDateKey = parseMemberPortalDateKey(sp.date);

  const [calendar, formOptions, noticeOptions] = await Promise.all([
    view === "week"
      ? associationScheduleService.getWeekCalendar(actor, {
          dateKey: anchorDateKey,
        })
      : associationScheduleService.getMonthCalendar(actor, {
          month: sp.month,
          anchorDateKey,
        }),
    associationScheduleService.listFormOptions(actor),
    associationScheduleService.listNoticeOptions(actor),
  ]);

  if (view === "week") {
    const week = calendar as Awaited<
      ReturnType<typeof associationScheduleService.getWeekCalendar>
    >;
    return (
      <>
        <OrganizerDashboardPageHeader
          title="일정 관리"
          description="협회 운영 일정을 달력으로 확인합니다."
        />
        <div className="mt-6">
          <AssociationScheduleCalendarApp
            view="week"
            year={Number(week.anchorDateKey.slice(0, 4))}
            month={Number(week.anchorDateKey.slice(5, 7))}
            monthLabel=""
            schedulesByDate={week.schedulesByDate}
            weekDateKeys={week.dateKeys}
            anchorDateKey={week.anchorDateKey}
            formOptions={formOptions}
            noticeOptions={noticeOptions}
          />
        </div>
      </>
    );
  }

  const month = calendar as Awaited<
    ReturnType<typeof associationScheduleService.getMonthCalendar>
  >;

  return (
    <>
      <OrganizerDashboardPageHeader
        title="일정 관리"
        description="협회 운영 일정을 달력으로 확인합니다."
      />
      <div className="mt-6">
        <AssociationScheduleCalendarApp
          view="month"
          year={month.year}
          month={month.month}
          monthLabel={month.monthLabel}
          cells={month.cells}
          schedulesByDate={month.schedulesByDate}
          anchorDateKey={anchorDateKey}
          formOptions={formOptions}
          noticeOptions={noticeOptions}
        />
      </div>
    </>
  );
}
