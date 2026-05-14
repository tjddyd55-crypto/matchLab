import { EventDivisionManager } from "@/components/domain/events/EventDivisionManager";
import { EventForm } from "@/components/domain/events/EventForm";
import { EventManagementNav } from "@/components/domain/events/EventManagementNav";
import { EventPaymentSettingForm } from "@/components/domain/events/EventPaymentSettingForm";
import { EventRecordingStreamingSettings } from "@/components/domain/events/EventRecordingStreamingSettings";
import { EventStatusControl } from "@/components/domain/events/EventStatusControl";
import { EventStatusPill } from "@/components/domain/events/EventStatusPill";
import { PermissionError } from "@/lib/auth/permission-error";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { EventStatus } from "@/lib/enums";
import { eventService } from "@/lib/services/event.service";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OrganizerEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;

  let detail;
  try {
    detail = await eventService.getOrganizerEventDetail(actor, eventId);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    if (e instanceof PermissionError && e.reason === "NOT_FOUND") notFound();
    throw e;
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 md:px-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
            {detail.title}
          </h1>
          <EventStatusPill status={detail.status} />
        </div>
        <p className="text-muted-foreground text-sm">
          {detail.location ?? "—"} ·{" "}
          {new Date(detail.eventDate).toLocaleString("ko-KR", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
        {detail.status === EventStatus.draft ? (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
            작성 중인 대회는 공개 URL로 접속해도 공고가 보이지 않습니다. 신청
            공개(OPEN) 전환 후 확인해 주세요.
          </p>
        ) : null}
      </header>

      <EventManagementNav eventId={detail.id} publicSlug={detail.publicSlug} />

      <EventStatusControl event={detail} />

      <EventForm mode="edit" actorRole={actor.role} initial={detail} />

      <EventRecordingStreamingSettings event={detail} />

      <EventDivisionManager
        eventId={detail.id}
        status={detail.status}
        divisions={detail.divisions}
      />

      <EventPaymentSettingForm
        eventId={detail.id}
        initial={detail.paymentSetting}
      />
    </div>
  );
}
