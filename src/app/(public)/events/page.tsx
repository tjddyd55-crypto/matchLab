import { PublicEventCard } from "@/components/domain/events/PublicEventCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { eventService } from "@/lib/services/event.service";

export const dynamic = "force-dynamic";

export default async function PublicEventsPage() {
  const events = await eventService.listPublicEvents();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-6">
      <div className="space-y-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          공개 대회 목록
        </h1>
        <p className="text-muted-foreground text-sm">
          신청·운영 정보는 역할별 로그인 후 제공됩니다.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="event-search" className="text-sm font-medium">
          검색
        </label>
        <input
          id="event-search"
          placeholder="대회명 검색 (MVP에서 미연결)"
          disabled
          aria-describedby="event-search-hint"
          className="border-input bg-muted/40 text-muted-foreground placeholder:text-muted-foreground flex h-9 w-full max-w-md rounded-md border px-3 py-1 text-sm shadow-sm"
        />
        <p id="event-search-hint" className="text-muted-foreground text-xs">
          현재는 전체 공개 목록만 표시합니다. 검색·필터는 이후 단계에서
          연결합니다.
        </p>
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="공개된 대회가 없습니다"
          description="주최측에서 공개 상태로 전환된 대회가 있으면 여기에 표시됩니다."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <PublicEventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}
