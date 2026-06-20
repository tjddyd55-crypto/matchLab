import Link from "next/link";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { ApplicationFormTemplateEditor } from "@/components/domain/application-form-templates/ApplicationFormTemplateEditor";
import { applicationFormTemplateService } from "@/lib/services/application-form-template.service";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const BASE_PATH = "/organizer/application-form-templates";

export default async function NewOrganizerApplicationFormTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ copyFrom?: string }>;
}) {
  await requireActor();
  const sp = await searchParams;
  const copyFrom = sp.copyFrom?.trim();

  let initial:
    | Awaited<ReturnType<typeof applicationFormTemplateService.getTemplateDetail>>
    | undefined;

  if (copyFrom) {
    const actor = await requireActor();
    try {
      const source = await applicationFormTemplateService.getTemplateDetail(
        actor,
        copyFrom,
      );
      initial = {
        ...source,
        id: "",
        title: `${source.title} (복사)`,
        organizerId: actor.organizerId ?? null,
        organizerName: null,
        isActive: true,
      };
    } catch (e) {
      if (!(e instanceof AppError)) throw e;
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {copyFrom ? "공용 템플릿 복사" : "새 신청서 템플릿"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            PDF 또는 자체 폼 방식으로 신청서를 구성합니다.
          </p>
        </div>
        <Link
          href={BASE_PATH}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          목록
        </Link>
      </div>
      <ApplicationFormTemplateEditor
        mode="create"
        initial={initial}
        editorContext={{ audience: "organizer", basePath: BASE_PATH }}
      />
    </div>
  );
}
