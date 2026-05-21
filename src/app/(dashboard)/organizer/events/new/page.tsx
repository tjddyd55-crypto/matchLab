import { EventForm } from "@/components/domain/events/EventForm";
import { requireActor } from "@/lib/auth/actor";

export const dynamic = "force-dynamic";

export default async function OrganizerNewEventPage() {
  const actor = await requireActor();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          대회 생성
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          생성 후 상태는 작성 중(draft)이며, 필수 항목을 채운 뒤 신청 공개로
          전환하면 공개 목록에 나타납니다. 부문(체급)은 생성 후 대회 상세에서
          체급표 템플릿을 불러와 한 번에 만들 수 있습니다.
        </p>
      </div>
      <EventForm mode="create" actorRole={actor.role} />
    </div>
  );
}
