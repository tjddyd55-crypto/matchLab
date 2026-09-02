import Link from "next/link";
import { notFound } from "next/navigation";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { IntakeFormEditorApp } from "@/components/domain/intake-forms/IntakeFormEditorApp";
import { buttonVariants } from "@/components/ui/button";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { PermissionError } from "@/lib/auth/permission-error";
import { AppError } from "@/lib/errors/app-error";
import { requireAssociationOrganizerPage } from "@/lib/permissions";
import { intakeFormService } from "@/lib/services/intake-form.service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrganizerIntakeFormEditPage({
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

  return (
    <>
      <OrganizerDashboardPageHeader title="신청 폼 편집" description={form.title}>
        <Link
          href={`/organizer/intake-forms/${form.id}`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          상세
        </Link>
      </OrganizerDashboardPageHeader>
      <div className="mt-6">
        <IntakeFormEditorApp
          mode="edit"
          formId={form.id}
          initial={{
            title: form.title,
            description: form.description,
            status: form.status,
            startsAt: form.startsAt,
            closesAt: form.closesAt,
            maxSubmissions: form.maxSubmissions,
            completionMessage: form.completionMessage,
            fields: fields.map((f) => ({
              stableKey: f.stableKey,
              label: f.label,
              type: f.type,
              required: f.required,
              placeholder: f.placeholder ?? undefined,
              helpText: f.helpText ?? undefined,
              options: f.options,
              displayOrder: f.displayOrder,
            })),
          }}
        />
      </div>
    </>
  );
}
