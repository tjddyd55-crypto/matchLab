import Link from "next/link";
import { notFound } from "next/navigation";
import { AssociationNoticeForm } from "@/components/domain/association-notices/AssociationNoticeForm";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { buttonVariants } from "@/components/ui/button";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { AppError } from "@/lib/errors/app-error";
import { requireAssociationOrganizerPage } from "@/lib/permissions";
import { associationNoticeService } from "@/lib/services/association-notice.service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrganizerNoticeEditPage({
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

  return (
    <>
      <OrganizerDashboardPageHeader
        title="공지 수정"
        description={notice.title}
      >
        <Link
          href={`/organizer/notices/${notice.id}`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          상세
        </Link>
      </OrganizerDashboardPageHeader>
      <div className="mt-6">
        <AssociationNoticeForm
          mode="edit"
          noticeId={notice.id}
          initial={{
            title: notice.title,
            content: notice.content,
            isPinned: notice.isPinned,
          }}
        />
      </div>
    </>
  );
}
