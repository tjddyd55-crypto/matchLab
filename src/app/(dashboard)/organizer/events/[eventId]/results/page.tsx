import Link from "next/link";
import { EventManagementLayout } from "@/components/domain/events/EventManagementLayout";
import { EventManagementPageHeader } from "@/components/domain/events/EventManagementPageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { requireActor } from "@/lib/auth/actor";
import { resolveOrganizerEventPageError } from "@/lib/permissions";
import { loadEventManagementNavContext, eventManagementLayoutProps } from "@/lib/event-management-nav-context";
import { MatchRecordOutcome } from "@/lib/enums";
import { eventService } from "@/lib/services/event.service";
import { resultService } from "@/lib/services/result.service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function outcomeKo(o: MatchRecordOutcome): string {
  switch (o) {
    case MatchRecordOutcome.win:
      return "승";
    case MatchRecordOutcome.loss:
      return "패";
    case MatchRecordOutcome.draw:
      return "무";
    case MatchRecordOutcome.no_contest:
      return "노콘";
    default:
      return String(o);
  }
}

export default async function OrganizerEventResultsPage({
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
    resolveOrganizerEventPageError(e);
  }

  const [nav, rows] = await Promise.all([
    loadEventManagementNavContext(eventId),
    resultService.listEventResults(actor, eventId),
  ]);
  const sorted = [...rows].sort(
    (a, b) => b.matchDate.getTime() - a.matchDate.getTime(),
  );

  return (
    <EventManagementLayout {...eventManagementLayoutProps(nav)}>
      <EventManagementPageHeader
        title="결과"
        eventTitle={detail.title}
        description="MatchResult 행 단위로 표시합니다. 공개 페이지에는 확정 건만 노출됩니다."
      />

      <div className="flex flex-wrap gap-2">
        {detail.publicSlug ? (
          <Link
            href={`/events/${detail.publicSlug}/results`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            target="_blank"
            rel="noopener noreferrer"
          >
            공개 결과 페이지
          </Link>
        ) : null}
        <Link
          href={`/organizer/events/${eventId}/operation`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          경기 운영으로 이동
        </Link>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          title="등록된 결과가 없습니다"
          description="경기 운영 화면에서 결과를 확정하면 이곳에 MatchResult가 표시됩니다."
        />
      ) : (
        <div className="ring-foreground/10 overflow-x-auto rounded-xl border bg-card shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground border-b text-xs">
              <tr>
                <th className="px-3 py-2 font-medium">일시</th>
                <th className="px-3 py-2 font-medium">대진표 그룹</th>
                <th className="px-3 py-2 font-medium">경기구분</th>
                <th className="px-3 py-2 font-medium">선수(행 기준)</th>
                <th className="px-3 py-2 font-medium">상대</th>
                <th className="px-3 py-2 font-medium">기록</th>
                <th className="px-3 py-2 font-medium">결방식</th>
                <th className="px-3 py-2 font-medium">상태</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="text-muted-foreground whitespace-nowrap px-3 py-2">
                    {r.matchDate.toLocaleString("ko-KR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="max-w-[140px] truncate px-3 py-2 font-medium">
                    {r.bracketTitle}
                  </td>
                  <td className="text-muted-foreground max-w-[120px] truncate px-3 py-2">
                    {r.divisionLabel ?? "—"}
                  </td>
                  <td className="px-3 py-2">{r.fighterName}</td>
                  <td className="text-muted-foreground px-3 py-2">
                    {r.opponentName ?? "—"}
                  </td>
                  <td className="px-3 py-2 font-medium">{outcomeKo(r.result)}</td>
                  <td className="text-muted-foreground px-3 py-2">
                    {r.resultTypeLabel ?? "—"}
                  </td>
                  <td className="px-3 py-2">{r.statusLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </EventManagementLayout>
  );
}
