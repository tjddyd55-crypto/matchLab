import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import {
  applicationService,
  type EventApplicationFormDTO,
} from "@/lib/services/application.service";
import { applicationBatchService } from "@/lib/services/application-batch.service";
import { applicationDocumentService } from "@/lib/services/application-document.service";
import { EventApplicationForm } from "@/components/domain/applications/EventApplicationForm";
import { GymBulkApplicationForm } from "@/components/domain/applications/GymBulkApplicationForm";
import { GymOfficialApplicationWorkspace } from "@/components/domain/applications/GymOfficialApplicationWorkspace";
import { GymAthleteFeePreflight } from "@/components/domain/applications/GymAthleteFeePreflight";
import { PublicApplicationEmptyState } from "@/components/domain/applications/PublicApplicationEmptyState";
import { GymEventSubpageHeader } from "@/components/domain/gyms/GymEventSubpageHeader";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
} from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function registrationPeriodMeta(form: EventApplicationFormDTO) {
  return (
    <p className={cn(matchonPageDescClass, "text-xs")}>
      신청 기간{" "}
      {new Date(form.event.registrationStartDate).toLocaleString("ko-KR")} ~{" "}
      {new Date(form.event.registrationEndDate).toLocaleString("ko-KR")}
    </p>
  );
}

export default async function GymEventApplyPage({
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
          <PublicApplicationEmptyState
            title="체육관 계정이 필요합니다"
            description="대회 신청은 체육관(관장) 계정에서 진행합니다."
            tone="warning"
          />
        </div>
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
      <div className={matchonPageContainerClass}>
        <div className={matchonPageStackClass}>
          <PublicApplicationEmptyState
            title="신청할 수 없습니다"
            description={blocked.message}
            tone="error"
          />
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className={matchonPageContainerClass}>
        <div className={matchonPageStackClass}>
          <PublicApplicationEmptyState
            title="대회 정보를 불러올 수 없습니다"
            description="잠시 후 다시 시도해 주세요."
            tone="error"
          />
        </div>
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
      <div className={matchonPageContainerClass}>
        <div className={matchonPageStackClass}>
          <GymEventSubpageHeader
            eventId={eventId}
            eventTitle={form.event.title}
            pageTitle="참가 신청"
            active="apply"
            meta={registrationPeriodMeta(form)}
          />
          <PublicApplicationEmptyState
            title="신청 가능한 경기구분이 없습니다"
            description="주최자에게 문의해 주세요."
            tone="warning"
          />
        </div>
      </div>
    );
  }

  if (form.fighters.length === 0) {
    return (
      <div className={matchonPageContainerClass}>
        <div className={matchonPageStackClass}>
          <GymEventSubpageHeader
            eventId={eventId}
            eventTitle={form.event.title}
            pageTitle="참가 신청"
            active="apply"
            meta={registrationPeriodMeta(form)}
          />
          <PublicApplicationEmptyState
            title="신청 가능한 선수가 없습니다"
            description="먼저 선수를 등록한 뒤 대회 신청을 진행해 주세요."
            tone="info"
            action={
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Link
                  href={`/gym/fighters/new?returnTo=/gym/events/${eventId}/apply`}
                  className={cn(buttonVariants({ size: "field" }), "w-full sm:w-auto")}
                >
                  선수 직접 등록
                </Link>
                <Link
                  href="/gym/fighters"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "field" }),
                    "w-full sm:w-auto",
                  )}
                >
                  소속 선수 관리
                </Link>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <GymEventSubpageHeader
          eventId={eventId}
          eventTitle={form.event.title}
          pageTitle="참가 신청"
          active="apply"
          meta={registrationPeriodMeta(form)}
        />

        <GymAthleteFeePreflight
          eventId={form.event.id}
          organizerDepositPerAthlete={form.event.organizerDepositPerAthlete}
          initialAthleteFee={form.event.gymAthleteFeeGuidance}
          initialNote={form.event.gymAthleteFeeNote}
        />

        {form.applicationForm.mode === "pdf" && workspace.template ? (
          <GymOfficialApplicationWorkspace
            workspace={workspace}
            documents={documents}
            divisions={form.divisions}
            fighters={form.fighters}
          />
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>선수 일괄 신청</CardTitle>
            <CardDescription>
              소속 선수 목록에서 신청할 선수를 선택하고, 각 선수별 경기구분을 지정한
              뒤 한 번에 저장합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GymBulkApplicationForm
              eventId={form.event.id}
              divisions={form.divisions}
              fighters={form.fighters}
              streamingAgreementRequired={form.event.streamingAgreementRequired}
              streamingNoticeText={form.event.streamingNoticeText}
              applicationForm={form.applicationForm}
            />
          </CardContent>
        </Card>

        <details className="group">
          <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <Card
              variant="muted"
              className="transition-colors group-open:rounded-b-none"
            >
              <CardHeader>
                <CardTitle className="text-base">기존 방식으로 1명씩 신청하기</CardTitle>
                <CardDescription>
                  경기구분을 먼저 선택한 뒤 선수 1명을 지정해 개별 신청합니다.
                </CardDescription>
              </CardHeader>
            </Card>
          </summary>
          <Card variant="muted" className="-mt-4 rounded-t-none border-t-0 pt-0">
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm leading-relaxed">
                공식 PDF 신청서와 별도로 동일한 경기구분별 신청·입금 흐름을 사용합니다.
              </p>
              <EventApplicationForm
                eventId={form.event.id}
                divisions={form.divisions}
                fighters={form.fighters}
                streamingAgreementRequired={form.event.streamingAgreementRequired}
                streamingNoticeText={form.event.streamingNoticeText}
              />
            </CardContent>
          </Card>
        </details>
      </div>
    </div>
  );
}
