import { PublicEventsBoard } from "@/components/domain/events/PublicEventsBoard";
import { PUBLIC_EVENTS_CONTAINER_CLASS } from "@/components/domain/events/public/public-event-layout";
import { eventService } from "@/lib/services/event.service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PublicEventsPage() {
  const events = await eventService.listPublicEvents();
  const sportOptions = [
    ...new Set(
      events.map((e) => e.primarySport).filter((s): s is string => Boolean(s)),
    ),
  ].sort();

  return (
    <div className={cn(PUBLIC_EVENTS_CONTAINER_CLASS, "flex flex-col gap-8 py-8")}>
      <div className="space-y-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          대회 공고
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
          참가 가능한 대회를 확인하고 체육관 계정으로 신청하세요. 참가비·입금
          안내는 체육관을 통해 제공되며, 공개 페이지에는 계좌번호가 표시되지
          않습니다.
        </p>
      </div>

      <PublicEventsBoard events={events} sportOptions={sportOptions} />
    </div>
  );
}
