import Link from "next/link";
import { requireActor } from "@/lib/auth/actor";
import { requireOrganizerForEventPage } from "@/lib/permissions";
import { applicationBatchService } from "@/lib/services/application-batch.service";
import { EmptyState } from "@/components/shared/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { EventManagementLayout } from "@/components/domain/events/EventManagementLayout";
import { EventManagementPageHeader } from "@/components/domain/events/EventManagementPageHeader";
import { loadEventManagementNavContext } from "@/lib/event-management-nav-context";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrganizerApplicationBatchesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const actor = await requireActor();
  const { eventId } = await params;
  await requireOrganizerForEventPage(actor, eventId);

  const [nav, batches] = await Promise.all([
    loadEventManagementNavContext(eventId),
    applicationBatchService.listBatchesForOrganizer(actor, eventId),
  ]);

  return (
    <EventManagementLayout eventId={nav.eventId} publicSlug={nav.publicSlug}>
      <EventManagementPageHeader
        title="공식 신청서 묶음"
        eventTitle={nav.title}
        description="체육관이 PDF 공식 신청서로 제출한 묶음 목록입니다."
      />

      {batches.length === 0 ? (
        <EmptyState
          title="제출된 신청 묶음이 없습니다"
          description="체육관에서 공식 신청서 템플릿이 연결된 대회에 제출하면 여기에 표시됩니다."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">접수번호</th>
                <th className="px-4 py-3 font-medium">체육관</th>
                <th className="px-4 py-3 font-medium">선수 수</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium">제출일</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="px-4 py-3 font-mono text-xs">
                    {b.documentNo ?? "—"}
                  </td>
                  <td className="px-4 py-3">{b.gymName}</td>
                  <td className="px-4 py-3">{b.fighterCount}</td>
                  <td className="px-4 py-3">{b.status}</td>
                  <td className="text-muted-foreground px-4 py-3 text-xs">
                    {b.submittedAt
                      ? new Date(b.submittedAt).toLocaleString("ko-KR")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/organizer/events/${eventId}/application-batches/${b.id}`}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                      )}
                    >
                      상세
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </EventManagementLayout>
  );
}
