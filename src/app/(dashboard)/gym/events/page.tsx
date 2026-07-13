import { requireActor } from "@/lib/auth/actor";
import { eventService } from "@/lib/services/event.service";
import { GymEventCard } from "@/components/domain/events/GymEventCard";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { MatchonEmptyState } from "@/components/shared/MatchonEmptyState";
import {
  matchonGridGapClass,
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GymEventsPage() {
  const actor = await requireActor();
  const events = await eventService.listEventsForGymDashboard(actor);

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        {!actor.gymId ? <GymProfileMissingBanner /> : null}
        <div className="min-w-0 space-y-1">
          <h1 className={matchonPageTitleClass}>대회 목록</h1>
          <p className={matchonPageDescClass}>
            공개된 대회를 모두 표시합니다. 신청 가능 여부는 신청 기간·경기구분·입금
            설정·소속 선수에 따라 카드에 안내됩니다.
          </p>
        </div>

        {events.length === 0 ? (
          <MatchonEmptyState
            title="표시할 대회가 없습니다"
            description="주최자가 대회를 공개(OPEN 등)하면 여기에 표시됩니다."
          />
        ) : (
          <div
            className={cn(
              "grid sm:grid-cols-2 xl:grid-cols-3",
              matchonGridGapClass,
            )}
          >
            {events.map((event) => (
              <GymEventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
