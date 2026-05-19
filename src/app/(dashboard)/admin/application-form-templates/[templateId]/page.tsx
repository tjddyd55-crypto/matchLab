import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplicationFormTemplateForm } from "@/components/domain/application-form-templates/ApplicationFormTemplateForm";
import { ApplicationFormTemplatePdfPreview } from "@/components/domain/application-form-templates/ApplicationFormTemplatePdfPreview";
import { buttonVariants } from "@/components/ui/button";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { applicationFormTemplateService } from "@/lib/services/application-form-template.service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EditApplicationFormTemplatePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const actor = await requireActor();
  const { templateId } = await params;

  let template;
  try {
    template = await applicationFormTemplateService.getTemplateDetail(
      actor,
      templateId,
    );
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") {
      notFound();
    }
    throw e;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-6">
      <Link
        href="/admin/application-form-templates"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 w-fit")}
      >
        ← 템플릿 목록
      </Link>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        템플릿 편집
      </h1>
      <p className="text-muted-foreground text-sm">{template.title}</p>
      {template.originalPdfFileName ? (
        <ApplicationFormTemplatePdfPreview
          templateId={template.id}
          fileName={template.originalPdfFileName}
        />
      ) : null}
      <ApplicationFormTemplateForm mode="edit" initial={template} />
    </div>
  );
}
