import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import {
  applicationService,
  type EventApplicationFormDTO,
} from "@/lib/services/application.service";
import { applicationBatchService } from "@/lib/services/application-batch.service";
import { applicationDocumentService } from "@/lib/services/application-document.service";
import { EventApplicationForm } from "@/components/domain/applications/EventApplicationForm";
import { GymOfficialApplicationWorkspace } from "@/components/domain/applications/GymOfficialApplicationWorkspace";
import { GymAthleteFeePreflight } from "@/components/domain/applications/GymAthleteFeePreflight";
import Link from "next/link";
import { EmptyState } from "@/components/shared/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GymEventApplyPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;

  if (!actor.gymId) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-6">
        <EmptyState
          title="체육관 계정이 필요합니다"
          description="대회 신청은 체육관(관장) 계정에서 진행됩니다."
        />
      </div>
    );
  }

  let form: EventApplicationFormDTO | null = null;
  let blocked: AppError | null = null;

  try {
    form = await applicationService.getEventApplicationForm(actor, eventId);
  } catch (e) {
    if (e instanceof AppError) {
      blocked = e;
    } else {
      throw e;
    }
  }

  if (blocked) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-6">
        <EmptyState title="신청할 수 없습니다" description={blocked.message} />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-6">
        <EmptyState
          title="대회 정보를 불러올 수 없습니다"
          description="잠시 후 다시 시도해 주세요."
        />
      </div>
    );
  }

  const workspace = await applicationBatchService.getGymApplicationWorkspace(
    actor,
    eventId,
  );

  const documents =
    workspace.batch?.id != null
      ? await applicationDocumentService.listDocumentsForGymBatch(
          actor,
          workspace.batch.id,
        )
      : [];

  if (form.divisions.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-6">
        <EmptyState
          title="신청 가능한 부문이 없습니다"
          description="주최자에게 문의해 주세요."
        />
      </div>
    );
  }

  if (form.fighters.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-6">
        <EmptyState
          title="신청 가능한 선수가 없습니다"
          description="먼저 선수를 등록한 뒤 대회 신청을 진행해 주세요."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href={`/gym/fighters/new?returnTo=/gym/events/${eventId}/apply`}
                className={cn(buttonVariants({ size: "sm" }))}
              >
                선수 직접 등록
              </Link>
              <Link
                href="/gym/fighters"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                소속 선수 관리
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 md:px-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          대회 신청
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{form.event.title}</p>
        <p className="text-muted-foreground mt-2 text-xs">
          신청 기간{" "}
          {new Date(form.event.registrationStartDate).toLocaleString("ko-KR")} ~{" "}
          {new Date(form.event.registrationEndDate).toLocaleString("ko-KR")}
        </p>
      </div>

      <GymAthleteFeePreflight
        eventId={form.event.id}
        organizerDepositPerAthlete={form.event.organizerDepositPerAthlete}
        initialAthleteFee={form.event.gymAthleteFeeGuidance}
        initialNote={form.event.gymAthleteFeeNote}
      />

      {workspace.template ? (
        <GymOfficialApplicationWorkspace
          workspace={workspace}
          documents={documents}
          divisions={form.divisions}
          fighters={form.fighters}
        />
      ) : (
        <div className="rounded-xl border border-dashed p-4 text-sm">
          <p className="font-medium">공식 신청서 템플릿 미연결</p>
          <p className="text-muted-foreground mt-1 leading-relaxed">
            이 대회에는 아직 공식 PDF 신청서 템플릿이 연결되지 않았습니다.
            주최자에게 템플릿 연결을 요청하거나, 아래 기존 부문별 신청을
            이용해 주세요.
          </p>
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          {workspace.template ? "부문별 개별 신청 (기존)" : "부문별 개별 신청"}
        </h2>
        {workspace.template ? (
          <p className="text-muted-foreground text-sm leading-relaxed">
            공식 PDF 신청서 묶음과 별도로, 부문·선수 단위의 기존 신청·입금 흐름을
            사용할 수 있습니다.
          </p>
        ) : null}
        <EventApplicationForm
          eventId={form.event.id}
          divisions={form.divisions}
          fighters={form.fighters}
          streamingAgreementRequired={form.event.streamingAgreementRequired}
          streamingNoticeText={form.event.streamingNoticeText}
        />
      </section>
    </div>
  );
}
