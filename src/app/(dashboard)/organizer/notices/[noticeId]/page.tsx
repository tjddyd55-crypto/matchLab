import Link from "next/link";
import { notFound } from "next/navigation";
import { AssociationNoticeDeleteButton } from "@/components/domain/association-notices/AssociationNoticeDeleteButton";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { formatPublicDateTime } from "@/lib/date-display";
import { AppError } from "@/lib/errors/app-error";
import { requireAssociationOrganizerPage } from "@/lib/permissions";
import { associationNoticeService } from "@/lib/services/association-notice.service";
import { prisma } from "@/lib/prisma";
import { buildIntakeFormPublicPath } from "@/lib/intake-form/public-url";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrganizerNoticeDetailPage({
  params,
}: {
  params: Promise<{ noticeId: string }>;
}) {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["organizer", "admin"]);
  requireAssociationOrganizerPage(actor);
  const { noticeId } = await params;

  let notice;
  try {
    notice = await associationNoticeService.getForAssociation(actor, noticeId);
  } catch (e) {
    if (
      e instanceof AppError &&
      (e.code === "NOT_FOUND" || e.code === "FORBIDDEN")
    ) {
      notFound();
    }
    if (e instanceof PermissionError) notFound();
    throw e;
  }

  const relatedForm = notice.relatedFormId
    ? await prisma.intakeForm.findFirst({
        where: { id: notice.relatedFormId, deletedAt: null },
        select: { title: true, publicToken: true },
      })
    : null;

  return (
    <>
      <OrganizerDashboardPageHeader
        title={notice.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {notice.isPinned ? <Badge variant="secondary">고정</Badge> : null}
            <span>
              작성 {formatPublicDateTime(notice.publishedAt.toISOString())}
            </span>
            <span>
              · 수정 {formatPublicDateTime(notice.updatedAt.toISOString())}
            </span>
          </span>
        }
      >
        <div className="flex flex-wrap gap-2">
          <Link
            href="/organizer/notices"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            목록
          </Link>
          <Link
            href={`/organizer/notices/${notice.id}/edit`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            수정
          </Link>
          <AssociationNoticeDeleteButton
            noticeId={notice.id}
            title={notice.title}
          />
        </div>
      </OrganizerDashboardPageHeader>
      <article className="mt-6 rounded-xl border border-matchon-border bg-white p-5 md:p-6">
        <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-matchon-text-primary">
          {notice.content}
        </div>
        {relatedForm ? (
          <div className="mt-6 border-t border-matchon-border pt-4">
            <Link
              href={buildIntakeFormPublicPath(relatedForm.publicToken)}
              className={cn(buttonVariants())}
              target="_blank"
            >
              신청하기
            </Link>
            <p className="mt-2 text-xs text-matchon-text-secondary">
              연결된 신청 폼: {relatedForm.title}
            </p>
          </div>
        ) : null}
      </article>
    </>
  );
}
