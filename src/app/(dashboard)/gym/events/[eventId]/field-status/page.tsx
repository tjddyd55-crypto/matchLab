import { GymFieldStatusBoard } from "@/components/domain/field-status/GymFieldStatusBoard";
import { GymEventSubpageHeader } from "@/components/domain/gyms/GymEventSubpageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { fieldStatusService } from "@/lib/services/field-status.service";
import {
  matchonPageContainerClass,
  matchonPageStackClass,
} from "@/lib/ui/matchon-layout";

export const dynamic = "force-dynamic";

export default async function GymEventFieldStatusPage({
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
            description="현장 상태는 체육관(관장) 계정에서 조회할 수 있습니다."
          />
        </div>
      </div>
    );
  }

  let data: Awaited<ReturnType<typeof fieldStatusService.listGymEventFieldStatus>>;
  try {
    data = await fieldStatusService.listGymEventFieldStatus(actor, eventId);
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
          pageTitle="현장·계체 상태"
          active="field-status"
        />

        <FeedbackMessage tone="info">
          현장 확인·계체 상태는 주최측 현장 운영자가 기록합니다. 수정이 필요하면
          주최자에게 문의해 주세요.
        </FeedbackMessage>

        <GymFieldStatusBoard rows={data.rows} />
      </div>
    </div>
  );
}
