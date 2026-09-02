import Link from "next/link";
import { AssociationNoticeForm } from "@/components/domain/association-notices/AssociationNoticeForm";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { buttonVariants } from "@/components/ui/button";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { requireAssociationOrganizerPage } from "@/lib/permissions";
import { intakeFormService } from "@/lib/services/intake-form.service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrganizerNoticeCreatePage() {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["organizer", "admin"]);
  requireAssociationOrganizerPage(actor);
  const formOptions = await intakeFormService.listFormOptionsForOrganizer(actor);

  return (
    <>
      <OrganizerDashboardPageHeader
        title="공지 작성"
        description="회원 체육관에 전달할 공지를 작성합니다."
      >
        <Link
          href="/organizer/notices"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          목록
        </Link>
      </OrganizerDashboardPageHeader>
      <div className="mt-6">
        <AssociationNoticeForm mode="create" formOptions={formOptions} />
      </div>
    </>
  );
}
