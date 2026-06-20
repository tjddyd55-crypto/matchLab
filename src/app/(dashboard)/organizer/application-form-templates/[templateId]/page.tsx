import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { ApplicationFormTemplateEditor } from "@/components/domain/application-form-templates/ApplicationFormTemplateEditor";
import { applicationFormTemplateService } from "@/lib/services/application-form-template.service";
import { AppError } from "@/lib/errors/app-error";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const BASE_PATH = "/organizer/application-form-templates";

export default async function EditOrganizerApplicationFormTemplatePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const actor = await requireActor();
  const { templateId } = await params;

  let template: Awaited<
    ReturnType<typeof applicationFormTemplateService.getTemplateDetail>
  >;
  try {
    template = await applicationFormTemplateService.getTemplateDetail(
      actor,
      templateId,
    );
  } catch (e) {
    if (e instanceof AppError && (e.code === "NOT_FOUND" || e.code === "FORBIDDEN")) {
      notFound();
    }
    throw e;
  }

  if (!template.organizerId) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">공용 템플릿은 편집할 수 없습니다</h1>
        <p className="text-muted-foreground text-sm">
          공용 템플릿은 복사해서 내 템플릿으로 만든 뒤 수정할 수 있습니다.
        </p>
        <Link
          href={`${BASE_PATH}/new?copyFrom=${templateId}`}
          className={cn(buttonVariants(), "w-fit")}
        >
          내 템플릿으로 복사
        </Link>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            신청서 템플릿 수정
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{template.title}</p>
        </div>
        <Link
          href={BASE_PATH}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          목록
        </Link>
      </div>
      <ApplicationFormTemplateEditor
        mode="edit"
        initial={template}
        editorContext={{ audience: "organizer", basePath: BASE_PATH }}
      />
    </div>
  );
}
