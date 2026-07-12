import { GymEventStatusBoard } from "@/components/domain/gym-event-status/GymEventStatusBoard";
import { GymEventSubpageHeader } from "@/components/domain/gyms/GymEventSubpageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { gymEventStatusService } from "@/lib/services/gym-event-status.service";
import {
  matchonPageContainerClass,
  matchonPageStackClass,
} from "@/lib/ui/matchon-layout";

export const dynamic = "force-dynamic";

export default async function GymEventStatusPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;

  if (!actor.gymId) {
    return (
      <div className={matchonPageContainerClass}>
        <div className={matchonPageStackClass}>
          <EmptyState
            title="체육관 계정이 필요합니다"
            description="신청 현황은 체육관(관장) 계정에서 조회할 수 있습니다."
          />
        </div>
      </div>
    );
  }

  let data: Awaited<
    ReturnType<typeof gymEventStatusService.getGymEventStatusPage>
  >;
  try {
    data = await gymEventStatusService.getGymEventStatusPage(actor, eventId);
  } catch (e) {
    const message =
      e instanceof AppError ? e.message : "상태를 불러오지 못했습니다.";
    return (
      <div className={matchonPageContainerClass}>
        <div className={matchonPageStackClass}>
          <EmptyState title="조회할 수 없습니다" description={message} />
        </div>
      </div>
    );
  }

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <GymEventSubpageHeader
          eventId={eventId}
          eventTitle={data.eventTitle}
          pageTitle="신청 현황"
          publicSlug={data.publicSlug}
          active="status"
        />

        <FeedbackMessage tone="info">
          신청·입금·현장 확인·대진 정보는 조회만 가능합니다. 수정이 필요하면
          주최자 또는 소속 체육관 운영자에게 문의해 주세요.
        </FeedbackMessage>

        <GymEventStatusBoard data={data} />
      </div>
    </div>
  );
}
