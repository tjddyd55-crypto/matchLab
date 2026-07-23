import { requireActor } from "@/lib/auth/actor";
import { eventService } from "@/lib/services/event.service";
import { GymEventCard } from "@/components/domain/events/GymEventCard";
import { eventAnnouncementCardGridClass } from "@/components/domain/events/announcement/event-announcement-card-ui";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { MatchonEmptyState } from "@/components/shared/MatchonEmptyState";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";
import {
  matchonStatCardClass,
  matchonStatLabelClass,
  matchonStatValueClass,
  matchonStatsGridClass,
} from "@/lib/ui/matchon-shell-ui";

export const dynamic = "force-dynamic";

export default async function GymEventsPage() {
  const actor = await requireActor();
  const events = await eventService.listEventsForGymDashboard(actor);

  const openCount = events.filter((e) => e.availabilityPhase === "open").length;
  const scheduledCount = events.filter(
    (e) => e.availabilityPhase === "scheduled",
  ).length;
  const appliedCount = events.filter((e) => e.gymApplicationCount > 0).length;
  const closedCount = events.filter(
    (e) => e.availabilityPhase === "closed",
  ).length;
  const ongoingCount = events.filter(
    (e) => e.availabilityPhase === "ongoing",
  ).length;

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        {!actor.gymId ? <GymProfileMissingBanner /> : null}
        <div className="min-w-0 space-y-1">
          <h1 className={matchonPageTitleClass}>대회 목록</h1>
          <p className={matchonPageDescClass}>
            참가 가능한 대회를 확인하고 소속 선수를 신청할 수 있습니다.
          </p>
        </div>

        <div className={matchonStatsGridClass}>
          <div className={matchonStatCardClass}>
            <p className={matchonStatLabelClass}>모집 중</p>
            <p className={matchonStatValueClass}>{openCount}</p>
          </div>
          <div className={matchonStatCardClass}>
            <p className={matchonStatLabelClass}>모집 예정</p>
            <p className={matchonStatValueClass}>{scheduledCount}</p>
          </div>
          <div className={matchonStatCardClass}>
            <p className={matchonStatLabelClass}>신청 완료</p>
            <p className={matchonStatValueClass}>{appliedCount}</p>
          </div>
          <div className={matchonStatCardClass}>
            <p className={matchonStatLabelClass}>마감</p>
            <p className={matchonStatValueClass}>{closedCount}</p>
          </div>
          <div className={matchonStatCardClass}>
            <p className={matchonStatLabelClass}>진행 중</p>
            <p className={matchonStatValueClass}>{ongoingCount}</p>
          </div>
        </div>

        {events.length === 0 ? (
          <MatchonEmptyState
            title="표시할 대회가 없습니다"
            description="주최자가 대회를 공개하면 여기에 표시됩니다."
          />
        ) : (
          <div className={eventAnnouncementCardGridClass}>
            {events.map((event) => (
              <GymEventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
