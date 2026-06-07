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
          대회명·일시·장소·신청 기간만 입력하면 생성할 수 있습니다. 포스터,
          부문·체급, 신청서, 참가비는 생성 후 관리 홈의 준비 체크리스트를 따라
          이어서 설정하면 됩니다.
        </p>
      </div>
      <EventForm mode="create" actorRole={actor.role} />
    </div>
  );
}
