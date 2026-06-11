import Link from "next/link";
import { EventManagementLayout } from "@/components/domain/events/EventManagementLayout";
import { EventManagementPageHeader } from "@/components/domain/events/EventManagementPageHeader";
import { OrganizerJudgeAssignmentSection } from "@/components/domain/judges/OrganizerJudgeAssignmentSection";
import { OrganizerJudgeCredentialManager } from "@/components/domain/judges/OrganizerJudgeCredentialManager";
import { requireActor } from "@/lib/auth/actor";
import { getAppBaseUrl } from "@/lib/app-url";
import { JUDGE_COUNT_POLICY_LINES } from "@/lib/judge-round-count";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { loadEventManagementNavContext } from "@/lib/event-management-nav-context";
import { judgeAssignmentService } from "@/lib/services/judge-assignment.service";
import { judgeCredentialService } from "@/lib/services/judge-credential.service";
import { matchService } from "@/lib/services/match.service";

export const dynamic = "force-dynamic";

export default async function OrganizerEventJudgesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;
  await requireOrganizerForEventPage(actor, eventId);

  const [nav, credentials, matches, assignments] = await Promise.all([
    loadEventManagementNavContext(eventId),
    judgeCredentialService.listForOrganizer(actor, eventId),
    matchService.listOrganizerEventMatches(actor, eventId),
    judgeAssignmentService.listByEventForOrganizer(actor, eventId),
  ]);

  const loginUrl = `${getAppBaseUrl()}/judge/login`;

  return (
    <EventManagementLayout eventId={nav.eventId} publicSlug={nav.publicSlug}>
      <EventManagementPageHeader
        title="심판 관리"
        eventTitle={nav.title}
        description="심판 접속 계정을 만들고 경기에 배정합니다. 채점 결과는 최종 결과 확정 전 참고 데이터입니다."
      >
        <Link
          href={`/organizer/events/${eventId}/operation`}
          className="text-primary mt-2 inline-block text-sm underline"
        >
          경기 운영 보드로 이동
        </Link>
      </EventManagementPageHeader>

      <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-xs leading-relaxed">
        {JUDGE_COUNT_POLICY_LINES.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <OrganizerJudgeCredentialManager
        eventId={eventId}
        credentials={credentials}
        loginUrl={loginUrl}
      />

      <div className="overflow-x-auto">
        <OrganizerJudgeAssignmentSection
          eventId={eventId}
          matches={matches}
          credentials={credentials}
          assignments={assignments}
        />
      </div>
    </EventManagementLayout>
  );
}
