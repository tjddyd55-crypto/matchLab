import { EventGalleryManager } from "@/components/domain/events/EventGalleryManager";
import { EventDivisionManager } from "@/components/domain/events/EventDivisionManager";
import { EventForm } from "@/components/domain/events/EventForm";
import { EventManagementLayout } from "@/components/domain/events/EventManagementLayout";
import { OrganizerEventNextActions } from "@/components/domain/events/OrganizerEventNextActions";
import { OrganizerEventSetupChecklist } from "@/components/domain/events/OrganizerEventSetupChecklist";
import { EventPaymentSettingForm } from "@/components/domain/events/EventPaymentSettingForm";
import { EventRecordingStreamingSettings } from "@/components/domain/events/EventRecordingStreamingSettings";
import { SpectatorSettingsSection } from "@/components/domain/events/SpectatorSettingsSection";
import { EventStatusControl } from "@/components/domain/events/EventStatusControl";
import { EventArchiveAccessBanner } from "@/components/domain/events/EventArchiveAccessBanner";
import { OrganizerEventFlashBanner } from "@/components/domain/events/OrganizerEventFlashBanner";
import { EventManagementPageHeader } from "@/components/domain/events/EventManagementPageHeader";
import { resolveOrganizerEventPageError } from "@/lib/permissions";
import { requireActor } from "@/lib/auth/actor";
import { resolveOrganizerRegistrationStatus } from "@/lib/event-organizer-status";
import { EventStatus } from "@/lib/enums";
import { EventApplicationFormTemplateSection } from "@/components/domain/events/EventApplicationFormTemplateSection";
import { applicationFormTemplateService } from "@/lib/services/application-form-template.service";
import { divisionTemplateService } from "@/lib/services/division-template.service";
import { eventRepository } from "@/lib/repositories/event.repository";
import { eventService } from "@/lib/services/event.service";
import {
  buildEventSetupChecklist,
  buildEventSetupInputFromDetail,
} from "@/lib/organizer-event-setup";
import type { ApplicationFormMode } from "@/lib/application-form/custom-form";
import { getServerAppBaseUrl } from "@/lib/qr-url";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function resolveLinkedFormMode(
  formModeLabel: string | undefined,
): ApplicationFormMode {
  if (!formModeLabel) return "none";
  if (formModeLabel.includes("자체")) return "custom";
  if (formModeLabel.includes("PDF")) return "pdf";
  return "none";
}

export default async function OrganizerEventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ welcome?: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;
  const sp = await searchParams;
  const showWelcome = sp.welcome === "1";

  let detail;
  let divisionTemplates;
  let divisionTemplateDetails;
  let formTemplates;
  let linkedTemplateId: string | null = null;
  try {
    detail = await eventService.getOrganizerEventDetail(actor, eventId);
    const eventApp = await eventRepository.findEventWithDivisionsForApplication(
      eventId,
    );
    linkedTemplateId = eventApp?.applicationFormTemplateId ?? null;
    [divisionTemplates, divisionTemplateDetails, formTemplates] =
      await Promise.all([
      divisionTemplateService.listTemplatesForEvent(actor, eventId),
      divisionTemplateService.listTemplateDetailsForEvent(actor, eventId),
      applicationFormTemplateService.listSelectableForEvent(actor, eventId),
    ]);
  } catch (e) {
    resolveOrganizerEventPageError(e);
  }

  const baseUrl = getServerAppBaseUrl(await headers());

  const linkedTemplate = linkedTemplateId
    ? formTemplates.find((t) => t.id === linkedTemplateId)
    : null;

  const setupInput = buildEventSetupInputFromDetail(detail, {
    applicationFormMode: resolveLinkedFormMode(linkedTemplate?.formModeLabel),
    applicationFormConfigured: linkedTemplateId !== null,
  });
  const setupChecklist = buildEventSetupChecklist(setupInput);

  return (
    <EventManagementLayout
      eventId={detail.id}
      publicSlug={detail.publicSlug}
      eventTitle={detail.title}
      eventStatus={detail.status}
      registrationStatus={resolveOrganizerRegistrationStatus({
        status: detail.status,
        registrationStartDate: detail.registrationStartDate,
        registrationEndDate: detail.registrationEndDate,
      })}
    >
      <EventManagementPageHeader
        title="관리 홈"
        description={
          <>
            {detail.location ?? "—"} ·{" "}
            {new Date(detail.eventDate).toLocaleString("ko-KR", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </>
        }
      />

      {detail.status === EventStatus.draft ? (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
            작성 중인 대회는 공개 URL로 접속해도 공고가 보이지 않습니다. 신청
            공개(OPEN) 전환 후 확인해 주세요.
          </p>
      ) : null}

      <OrganizerEventFlashBanner />

      {showWelcome ? (
        <OrganizerEventNextActions
          title="대회가 생성되었습니다"
          subtitle="이제 아래 순서대로 준비해 주세요. 생성 직후에는 작성 중 상태이며, 준비가 끝나면 신청 공개로 전환할 수 있습니다."
          actions={setupChecklist.nextActions}
        />
      ) : setupChecklist.completionRate < 100 ? (
        <OrganizerEventNextActions
          title="다음 작업"
          subtitle="아직 채우지 않은 준비 항목이 있습니다."
          actions={setupChecklist.nextActions}
        />
      ) : null}

      <OrganizerEventSetupChecklist checklist={setupChecklist} />

      <EventStatusControl event={detail} />

      <EventArchiveAccessBanner
        eventId={detail.id}
        status={detail.status}
        hasActiveArchive={detail.hasActiveArchive}
      />

      <EventForm mode="edit" actorRole={actor.role} initial={detail} />

      <EventRecordingStreamingSettings event={detail} />

      <SpectatorSettingsSection detail={detail} baseUrl={baseUrl} />

      <EventGalleryManager eventId={detail.id} images={detail.galleryImages} />

      <EventApplicationFormTemplateSection
        eventId={detail.id}
        linkedTemplateId={linkedTemplateId}
        templates={formTemplates}
      />

      <EventDivisionManager
        eventId={detail.id}
        status={detail.status}
        divisions={detail.divisions}
        templates={divisionTemplates}
        templateDetails={divisionTemplateDetails}
      />

      <EventPaymentSettingForm
        eventId={detail.id}
        initial={detail.paymentSetting}
      />
    </EventManagementLayout>
  );
}
