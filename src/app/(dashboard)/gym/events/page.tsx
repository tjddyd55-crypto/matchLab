import { requireActor } from "@/lib/auth/actor";
import { eventService } from "@/lib/services/event.service";
import { GymEventCard } from "@/components/domain/events/GymEventCard";
import { EmptyState } from "@/components/shared/EmptyState";

export const dynamic = "force-dynamic";

export default async function GymEventsPage() {
  const actor = await requireActor();
  const events = await eventService.listOpenRegistrationEventsForGymDashboard();

  if (!actor.gymId) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-6">
        <EmptyState
          title="체육관 계정이 필요합니다"
          description="관장 계정으로 로그인하면 신청 가능한 대회를 확인할 수 있습니다."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          신청 가능한 대회
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          상태가 열려 있고 신청 기간 안에 있는 공개 대회만 표시됩니다.
        </p>
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="신청 가능한 대회가 없습니다"
          description="신청 기간이 열리면 여기에서 바로 신청할 수 있습니다."
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
