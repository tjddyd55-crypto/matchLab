import Link from "next/link";
import { EventManagementLayout } from "@/components/domain/events/EventManagementLayout";
import { EventManagementPageHeader } from "@/components/domain/events/EventManagementPageHeader";
import { CourtJudgeLinksPanel } from "@/components/domain/judges/CourtJudgeLinksPanel";
import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { loadEventManagementNavContext } from "@/lib/event-management-nav-context";
import { eventCourtService } from "@/lib/services/event-court.service";
import { getServerAppBaseUrl } from "@/lib/qr-url";
import { buildCourtJudgeQrLinks } from "@/lib/services/judge-qr-entry.service";
import { headers } from "next/headers";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrganizerEventJudgesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;
  await requireOrganizerForEventPage(actor, eventId);

  const [nav, courts, headersList] = await Promise.all([
    loadEventManagementNavContext(eventId),
    eventCourtService.listForOrganizer(actor, eventId),
    headers(),
  ]);

  const baseUrl = getServerAppBaseUrl(headersList);
  const activeCourts = courts.filter((c) => c.isActive);
  const courtQrLinks = buildCourtJudgeQrLinks(eventId, activeCourts, baseUrl);

  return (
    <EventManagementLayout eventId={nav.eventId} publicSlug={nav.publicSlug}>
      <EventManagementPageHeader
        title="심판 관리"
        eventTitle={nav.title}
        description="경기장별 채점/주심 QR을 배포합니다. QR 접속 후 이름과 생년월일을 입력하면 해당 역할 화면으로 이동합니다."
      >
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            href={`/organizer/events/${eventId}/operation`}
            className={cn(buttonVariants({ variant: "outline", size: "field" }), "inline-flex")}
          >
            경기 운영 보드
          </Link>
          <Link
            href={`/organizer/events/${eventId}/qr`}
            className={cn(buttonVariants({ variant: "default", size: "field" }), "inline-flex")}
          >
            심판 QR 출력
          </Link>
        </div>
      </EventManagementPageHeader>

      <section className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-4 text-sm leading-relaxed">
        <p className="font-medium">현장 심판 운영 안내</p>
        <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5 text-xs">
          <li>각 경기장에 채점심판 QR과 주심판 QR을 따로 부착하세요.</li>
          <li>주심판이 경기 시작 → 진행중 강조 → 채점심판 채점 → 주심판 승패 입력/완료 순으로 진행합니다.</li>
          <li>다음 경기는 주심판이 수동으로 &quot;경기 시작&quot;을 눌러야 합니다.</li>
          <li>경기장 이름·순서를 변경해도 기존 QR은 계속 사용할 수 있습니다.</li>
        </ul>
      </section>

      <CourtJudgeLinksPanel
        courts={courts}
        courtQrLinks={courtQrLinks}
        eventId={eventId}
      />
    </EventManagementLayout>
  );
}
