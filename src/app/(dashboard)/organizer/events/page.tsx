import Link from "next/link";
import { OrganizerEventList } from "@/components/domain/events/OrganizerEventList";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { buttonVariants } from "@/components/ui/button";
import { requireActor } from "@/lib/auth/actor";
import { OrganizerType } from "@/lib/enums";
import { eventService } from "@/lib/services/event.service";
import { associationScheduleService } from "@/lib/services/association-schedule.service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrganizerEventsPage() {
  const actor = await requireActor();
  const rows = await eventService.listOrganizerEvents(actor);
  const isAssociation = actor.organizerType === OrganizerType.association;
  const [eventScheduleLinks, scheduleFormOptions, scheduleNoticeOptions] =
    isAssociation
      ? await Promise.all([
          associationScheduleService.mapEventScheduleLinks(
            actor,
            rows.map((row) => row.id),
          ),
          associationScheduleService.listFormOptions(actor),
          associationScheduleService.listNoticeOptions(actor),
        ])
      : [{}, [], []];

  return (
    <>
      <OrganizerDashboardPageHeader
        title="내 대회"
        description={
          <>
            작성 중(draft) 대회는 공개 목록에 표시되지 않습니다. 신청 공개 전
            경기구분·입금 계좌를 준비해 주세요.
          </>
        }
      >
        <Link
          href="/organizer/events/new"
          className={cn(buttonVariants({ size: "field" }))}
        >
          대회 만들기
        </Link>
      </OrganizerDashboardPageHeader>

      <OrganizerEventList
        rows={rows}
        showOrganizerColumn={actor.role === "admin"}
        showScheduleActions={isAssociation}
        eventScheduleLinks={eventScheduleLinks}
        scheduleFormOptions={scheduleFormOptions}
        scheduleNoticeOptions={scheduleNoticeOptions}
      />
    </>
  );
}
