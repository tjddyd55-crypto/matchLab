import { requireActor } from "@/lib/auth/actor";
import { eventService } from "@/lib/services/event.service";
import { GymEventCard } from "@/components/domain/events/GymEventCard";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { EmptyState } from "@/components/shared/EmptyState";

export const dynamic = "force-dynamic";

export default async function GymEventsPage() {
  const actor = await requireActor();
  const events = await eventService.listEventsForGymDashboard(actor);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-6">
      {!actor.gymId ? <GymProfileMissingBanner /> : null}
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          대회 목록
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          공개된 대회를 모두 표시합니다. 신청 가능 여부는 신청 기간·부문·입금
          설정·소속 선수에 따라 카드에 안내됩니다.
        </p>
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="표시할 대회가 없습니다"
          description="주최자가 대회를 공개(OPEN 등)하면 여기에 표시됩니다."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <GymEventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
