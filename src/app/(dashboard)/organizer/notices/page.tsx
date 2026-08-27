import Link from "next/link";
import { AssociationNoticeDeleteButton } from "@/components/domain/association-notices/AssociationNoticeDeleteButton";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { formatPublicDate } from "@/lib/date-display";
import { requireAssociationOrganizerPage } from "@/lib/permissions";
import { associationNoticeService } from "@/lib/services/association-notice.service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrganizerNoticesPage() {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["organizer", "admin"]);
  requireAssociationOrganizerPage(actor);
  const notices = await associationNoticeService.listForAssociation(actor);

  return (
    <>
      <OrganizerDashboardPageHeader
        title="공지사항"
        description="회원 체육관에 전달할 공지를 관리합니다."
      >
        <Link href="/organizer/notices/new" className={cn(buttonVariants())}>
          + 공지 작성
        </Link>
      </OrganizerDashboardPageHeader>

      <div className="mt-6">
        {notices.length === 0 ? (
          <div className="rounded-xl border border-dashed border-matchon-border bg-white px-6 py-12 text-center">
            <p className="text-sm font-medium text-matchon-text-secondary">
              등록된 공지사항이 없습니다.
            </p>
            <Link
              href="/organizer/notices/new"
              className={cn(buttonVariants({ className: "mt-4" }))}
            >
              첫 공지 작성
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-matchon-border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-matchon-border bg-matchon-surface text-matchon-text-secondary">
                <tr>
                  <th className="w-16 px-4 py-3 font-semibold">고정</th>
                  <th className="px-4 py-3 font-semibold">제목</th>
                  <th className="hidden w-36 px-4 py-3 font-semibold sm:table-cell">
                    작성일
                  </th>
                  <th className="hidden w-36 px-4 py-3 font-semibold md:table-cell">
                    수정일
                  </th>
                  <th className="w-28 px-4 py-3 font-semibold">관리</th>
                </tr>
              </thead>
              <tbody>
                {notices.map((notice) => (
                  <tr
                    key={notice.id}
                    className="border-b border-matchon-border last:border-0"
                  >
                    <td className="px-4 py-3">
                      {notice.isPinned ? (
                        <Badge variant="secondary">고정</Badge>
                      ) : (
                        <span className="text-matchon-text-secondary">—</span>
                      )}
                    </td>
                    <td className="max-w-0 px-4 py-3">
                      <Link
                        href={`/organizer/notices/${notice.id}`}
                        className="block truncate font-semibold text-matchon-text-primary hover:text-matchon-primary"
                        title={notice.title}
                      >
                        {notice.title}
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 text-matchon-text-secondary sm:table-cell">
                      {formatPublicDate(notice.publishedAt.toISOString())}
                    </td>
                    <td className="hidden px-4 py-3 text-matchon-text-secondary md:table-cell">
                      {formatPublicDate(notice.updatedAt.toISOString())}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Link
                          href={`/organizer/notices/${notice.id}/edit`}
                          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                        >
                          수정
                        </Link>
                        <AssociationNoticeDeleteButton
                          noticeId={notice.id}
                          title={notice.title}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
