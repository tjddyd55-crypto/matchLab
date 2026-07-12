import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplicationFormTemplateEditor } from "@/components/domain/application-form-templates/ApplicationFormTemplateEditor";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/button";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { applicationFormTemplateService } from "@/lib/services/application-form-template.service";
import { adminPageContainerClass, adminPageStackClass } from "@/lib/ui/admin-ui";
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
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <Link
          href="/admin/application-form-templates"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 w-fit")}
        >
          ← 템플릿 목록
        </Link>
        <AdminPageHeader
          title="신청서 템플릿 수정"
          description={template.title}
        />
        <ApplicationFormTemplateEditor mode="edit" initial={template} />
      </div>
    </div>
  );
}
