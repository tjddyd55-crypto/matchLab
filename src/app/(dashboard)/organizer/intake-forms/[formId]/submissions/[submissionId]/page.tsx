import Link from "next/link";
import { notFound } from "next/navigation";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { IntakeFormSubmissionDetail } from "@/components/domain/intake-forms/IntakeFormSubmissionDetail";
import { buttonVariants } from "@/components/ui/button";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { AppError } from "@/lib/errors/app-error";
import { requireAssociationOrganizerPage } from "@/lib/permissions";
import { intakeFormService } from "@/lib/services/intake-form.service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrganizerIntakeFormSubmissionPage({
  params,
}: {
  params: Promise<{ formId: string; submissionId: string }>;
}) {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["organizer", "admin"]);
  requireAssociationOrganizerPage(actor);
  const { formId, submissionId } = await params;

  let submission;
  let formTitle = "";
  try {
    const formData = await intakeFormService.getForOrganizer(actor, formId);
    formTitle = formData.form.title;
    submission = await intakeFormService.getSubmissionForOrganizer(
      actor,
      formId,
      submissionId,
    );
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    if (e instanceof PermissionError) notFound();
    throw e;
  }

  return (
    <>
      <OrganizerDashboardPageHeader
        title="신청 상세"
        description={formTitle}
      >
        <Link
          href={`/organizer/intake-forms/${formId}`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          신청자 목록
        </Link>
      </OrganizerDashboardPageHeader>
      <div className="mt-6">
        <IntakeFormSubmissionDetail
          formId={formId}
          submission={submission}
        />
      </div>
    </>
  );
}
