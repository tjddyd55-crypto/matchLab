import Link from "next/link";
import { notFound } from "next/navigation";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { IntakeFormLinkCopyButton } from "@/components/domain/intake-forms/IntakeFormLinkCopyButton";
import { IntakeFormStatusButtons } from "@/components/domain/intake-forms/IntakeFormStatusButtons";
import { IntakeFormSubmissionTable } from "@/components/domain/intake-forms/IntakeFormSubmissionTable";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { AppError } from "@/lib/errors/app-error";
import { INTAKE_FORM_STATUS_LABEL } from "@/lib/intake-form/ui-labels";
import { requireAssociationOrganizerPage } from "@/lib/permissions";
import { intakeFormService } from "@/lib/services/intake-form.service";
import { cn } from "@/lib/utils";
import { exportIntakeFormSubmissionsExcelAction } from "@/features/intake-forms/actions";

export const dynamic = "force-dynamic";

export default async function OrganizerIntakeFormDetailPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["organizer", "admin"]);
  requireAssociationOrganizerPage(actor);
  const { formId } = await params;

  let data;
  try {
    data = await intakeFormService.getForOrganizer(actor, formId);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    if (e instanceof PermissionError) notFound();
    throw e;
  }

  const { form, fields } = data;
  const submissions = await intakeFormService.listSubmissionsForOrganizer(
    actor,
    formId,
  );

  return (
    <>
      <OrganizerDashboardPageHeader
        title={form.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {INTAKE_FORM_STATUS_LABEL[form.status]}
            </Badge>
            <span>{submissions.length}건 신청</span>
          </span>
        }
      >
        <div className="flex flex-wrap gap-2">
          <IntakeFormLinkCopyButton publicToken={form.publicToken} />
          <Link
            href={`/organizer/intake-forms/${form.id}/edit`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            폼 편집
          </Link>
          {form.status !== "CLOSED" ? (
            <IntakeFormStatusButtons formId={form.id} status={form.status} />
          ) : (
            <IntakeFormStatusButtons formId={form.id} status={form.status} />
          )}
        </div>
      </OrganizerDashboardPageHeader>
      <IntakeFormSubmissionTable
        formId={form.id}
        submissions={submissions}
        previewFields={fields.slice(0, 3)}
        exportAction={exportIntakeFormSubmissionsExcelAction}
      />
    </>
  );
}
