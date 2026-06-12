import { EventForm } from "@/components/domain/events/EventForm";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { requireActor } from "@/lib/auth/actor";

export const dynamic = "force-dynamic";

export default async function OrganizerNewEventPage() {
  const actor = await requireActor();

  return (
    <>
      <OrganizerDashboardPageHeader
        title="대회 생성"
        description="대회명·일시·장소·신청 기간만 입력하면 생성할 수 있습니다. 포스터, 부문·체급, 신청서, 참가비는 생성 후 관리 홈의 준비 체크리스트를 따라 이어서 설정하면 됩니다."
      />
      <div className="max-w-3xl">
        <EventForm mode="create" actorRole={actor.role} />
      </div>
    </>
  );
}
